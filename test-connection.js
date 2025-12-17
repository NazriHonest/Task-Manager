// test-connection.js  
require('dotenv').config();  
const { Pool } = require('pg');  
  
const connectionString = process.env.DATABASE_URL;  
console.log('Testing database connection with URL:', connectionString);  
  
const pool = new Pool({ connectionString });  
  
async function testConnection() {  
  try {  
    const client = await pool.connect();  
    console.log('Connected to database successfully!');  
  
    // Test by running a simple query  
    const result = await client.query('SELECT NOW()');  
    console.log('Query result:', result.rows[0]);  
  
    client.release();  
    console.log('Database connection test completed successfully!');  
  } catch (error) {  
    console.error('Database connection failed:', error.message);  
  } finally {  
    await pool.end();  
  }  
}  
  
testConnection(); 
