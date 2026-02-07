// backend/server.js
// Production-ready Express server for InsurePulse

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel, CSV, and PDF files are allowed.'));
    }
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ==================== ROUTES ====================

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// User Registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, companyName, fullName } = req.body;

    // Validate input
    if (!email || !password || !companyName || !fullName) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password, company_name, full_name, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, email, company_name, full_name',
      [email, hashedPassword, companyName, fullName]
    );

    const user = result.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        companyName: user.company_name,
        fullName: user.full_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        companyName: user.company_name,
        fullName: user.full_name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Demo Request
app.post('/api/demo-request', async (req, res) => {
  try {
    const {
      fullName,
      jobTitle,
      companyName,
      email,
      whatsapp,
      policyCount,
      countries,
      linesOfBusiness,
      referralSource,
      message,
      selectedPlan
    } = req.body;

    // Save to database
    await pool.query(
      `INSERT INTO demo_requests 
       (full_name, job_title, company_name, email, whatsapp, policy_count, countries, lines_of_business, referral_source, message, selected_plan, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [fullName, jobTitle, companyName, email, whatsapp, policyCount, countries, JSON.stringify(linesOfBusiness), referralSource, message, selectedPlan]
    );

    // Send notification (implement email/WhatsApp notification here)
    // sendDemoRequestNotification({ email, whatsapp, companyName });

    res.status(201).json({
      message: 'Demo request received successfully. We will contact you within 24 hours.',
      success: true
    });
  } catch (error) {
    console.error('Demo request error:', error);
    res.status(500).json({ error: 'Failed to submit demo request' });
  }
});

// Upload and Process Data
app.post('/api/data/upload', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files;
    const userId = req.user.userId;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const processedData = [];

    for (const file of files) {
      let data;

      // Process Excel/CSV files
      if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel') || file.mimetype === 'text/csv') {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);

        // Validate and normalize data
        const normalized = await normalizeInsuranceData(data, userId);
        processedData.push({
          fileName: file.originalname,
          recordCount: normalized.length,
          data: normalized
        });

        // Store in database
        await storePortfolioData(userId, normalized);
      }
    }

    res.json({
      message: 'Files processed successfully',
      filesProcessed: files.length,
      totalRecords: processedData.reduce((sum, file) => sum + file.recordCount, 0),
      files: processedData.map(f => ({ fileName: f.fileName, recordCount: f.recordCount }))
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process files' });
  }
});

// Get Portfolio Summary
app.get('/api/portfolio/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get aggregate data
    const summary = await pool.query(
      `SELECT 
        COUNT(*) as policy_count,
        SUM(premium) as total_premium,
        SUM(CASE WHEN insurance_type = 'takaful' THEN premium ELSE 0 END) as takaful_premium,
        AVG(premium) as avg_premium
       FROM policies 
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const losses = await pool.query(
      `SELECT SUM(paid_amount + reserve_amount) as total_losses
       FROM claims 
       WHERE user_id = $1`,
      [userId]
    );

    const totalPremium = parseFloat(summary.rows[0].total_premium) || 0;
    const totalLosses = parseFloat(losses.rows[0].total_losses) || 0;
    const lossRatio = totalPremium > 0 ? totalLosses / totalPremium : 0;

    res.json({
      policyCount: parseInt(summary.rows[0].policy_count),
      totalPremium: totalPremium,
      takafulPercentage: totalPremium > 0 ? parseFloat(summary.rows[0].takaful_premium) / totalPremium : 0,
      avgPremium: parseFloat(summary.rows[0].avg_premium) || 0,
      lossRatio: lossRatio,
      combinedRatio: lossRatio * 1.15 // Simplified calculation
    });
  } catch (error) {
    console.error('Portfolio summary error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio summary' });
  }
});

// AI Query Endpoint
app.post('/api/ai/query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user.userId;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Get user's portfolio context
    const context = await getPortfolioContext(userId);

    // Call Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: `You are an AI assistant for GCC insurance analytics. Analyze this query using the user's portfolio data:

${context}

User Query: ${query}

Provide a concise, actionable response with specific numbers and recommendations. Focus on GCC market context, Takaful considerations, and regulatory implications where relevant.`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    const aiResponse = response.data.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n');

    // Log query for analytics
    await pool.query(
      'INSERT INTO ai_queries (user_id, query, response, created_at) VALUES ($1, $2, $3, NOW())',
      [userId, query, aiResponse]
    );

    res.json({
      query: query,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: 'Failed to process AI query' });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function normalizeInsuranceData(rawData, userId) {
  // Normalize column names and data format
  return rawData.map(row => ({
    userId: userId,
    policyNumber: row['Policy Number'] || row['policy_number'] || row['PolicyNo'],
    insuredName: row['Insured Name'] || row['insured_name'] || row['InsuredName'],
    premium: parseFloat(row['Premium'] || row['premium'] || 0),
    effectiveDate: parseDate(row['Effective Date'] || row['effective_date']),
    expirationDate: parseDate(row['Expiration Date'] || row['expiration_date']),
    lineOfBusiness: row['Line of Business'] || row['line_of_business'] || row['LOB'],
    country: row['Country'] || row['country'] || 'BH',
    insuranceType: row['Type'] || row['insurance_type'] || 'conventional',
    status: 'active'
  }));
}

async function storePortfolioData(userId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const record of data) {
      await client.query(
        `INSERT INTO policies (user_id, policy_number, insured_name, premium, effective_date, expiration_date, line_of_business, country, insurance_type, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
         ON CONFLICT (user_id, policy_number) 
         DO UPDATE SET 
           premium = EXCLUDED.premium,
           expiration_date = EXCLUDED.expiration_date,
           updated_at = NOW()`,
        [
          record.userId,
          record.policyNumber,
          record.insuredName,
          record.premium,
          record.effectiveDate,
          record.expirationDate,
          record.lineOfBusiness,
          record.country,
          record.insuranceType,
          record.status
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getPortfolioContext(userId) {
  const summary = await pool.query(
    `SELECT 
      COUNT(*) as policy_count,
      SUM(premium) as total_premium,
      string_agg(DISTINCT country, ', ') as countries,
      string_agg(DISTINCT line_of_business, ', ') as lines
     FROM policies 
     WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );

  const byCountry = await pool.query(
    `SELECT country, COUNT(*) as count, SUM(premium) as premium
     FROM policies
     WHERE user_id = $1 AND status = 'active'
     GROUP BY country`,
    [userId]
  );

  const byLine = await pool.query(
    `SELECT line_of_business, COUNT(*) as count, SUM(premium) as premium
     FROM policies
     WHERE user_id = $1 AND status = 'active'
     GROUP BY line_of_business`,
    [userId]
  );

  return `
Portfolio Summary:
- Total Policies: ${summary.rows[0].policy_count}
- Total Premium: $${parseFloat(summary.rows[0].total_premium || 0).toLocaleString()}
- Countries: ${summary.rows[0].countries || 'N/A'}
- Lines of Business: ${summary.rows[0].lines || 'N/A'}

By Country:
${byCountry.rows.map(r => `- ${r.country}: ${r.count} policies, $${parseFloat(r.premium).toLocaleString()}`).join('\n')}

By Line:
${byLine.rows.map(r => `- ${r.line_of_business}: ${r.count} policies, $${parseFloat(r.premium).toLocaleString()}`).join('\n')}
`;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
}

// ==================== START SERVER ====================

app.listen(PORT, () => {
  console.log(`✅ InsurePulse API server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  pool.end();
  process.exit(0);
});

module.exports = app;