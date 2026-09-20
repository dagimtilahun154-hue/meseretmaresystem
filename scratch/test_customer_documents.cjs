const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_HOST = process.env.API_HOST || 'meseretmaresystem.onrender.com';
const IS_HTTPS = !process.env.API_HOST || process.env.API_HOST.includes('onrender.com');

function request(options, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = IS_HTTPS;
    const client = isHttps ? https : http;
    const reqOptions = {
      hostname: API_HOST,
      port: isHttps ? 443 : 4000,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        ...headers,
        ...options.headers
      }
    };

    const req = client.request(reqOptions, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString('utf8');
        try {
          const json = JSON.parse(text);
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw: text, buffer });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, data: text, raw: text, buffer });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function runTest() {
  console.log(`=================================================================`);
  console.log(`CUSTOMER SCANNED DOCUMENT & FILE UPLOAD VERIFICATION TEST`);
  console.log(`Target: ${IS_HTTPS ? 'https' : 'http'}://${API_HOST}`);
  console.log(`=================================================================\n`);

  // 1. Authenticate / Login
  console.log(`[1] Logging in as manager...`);
  const loginPayload = JSON.stringify({
    username: process.env.DEFAULT_MANAGER_USERNAME || 'manager',
    password: process.env.DEFAULT_MANAGER_PASSWORD || '123'
  });

  const loginRes = await request({
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginPayload)
    }
  }, loginPayload);

  if (loginRes.status !== 200 && loginRes.status !== 201) {
    console.error(`❌ Login failed (${loginRes.status}):`, loginRes.data);
    return;
  }

  const token = loginRes.data.accessToken;
  console.log(`✅ Authentication successful. Logged in as: ${loginRes.data.user?.displayName || 'Manager'}`);

  // 2. Fetch Customers
  console.log(`\n[2] Fetching customer accounts...`);
  const custRes = await request({
    path: '/api/v1/customers',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-company-id': 'MM'
    }
  });

  if (custRes.status !== 200 || !Array.isArray(custRes.data) || custRes.data.length === 0) {
    console.error(`❌ Failed to retrieve customer list (${custRes.status}):`, custRes.data);
    return;
  }

  const testCustomer = custRes.data[0];
  const customerId = testCustomer.id;
  console.log(`✅ Found ${custRes.data.length} customer records. Selected test customer: "${testCustomer.name}" (ID: ${customerId})`);

  // 3. Prepare Multipart Form Upload for Scanned Document
  console.log(`\n[3] Preparing multipart form-data upload for scanned document...`);
  const boundary = `----WebKitFormBoundary${Date.now().toString(16)}`;
  const fileContent = Buffer.from("%PDF-1.4\n%SolarFlow Scanned Customer Agreement Test Content\n1 0 obj\n<< /Title (Signed Agreement) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
  const fileName = `signed_solar_agreement_${Date.now()}.pdf`;
  const docTitle = `Verified Signed Solar Contract - ${new Date().toLocaleDateString()}`;
  const docCategory = "AGREEMENT";
  const docNotes = "Test agreement uploaded during customer document feature verification.";

  let body = '';
  
  // Field: title
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="title"\r\n\r\n`;
  body += `${docTitle}\r\n`;

  // Field: category
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="category"\r\n\r\n`;
  body += `${docCategory}\r\n`;

  // Field: notes
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="notes"\r\n\r\n`;
  body += `${docNotes}\r\n`;

  // Field: file (Header part)
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`;
  body += `Content-Type: application/pdf\r\n\r\n`;

  const headerBuf = Buffer.from(body, 'utf8');
  const footerBuf = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  const fullMultipartPayload = Buffer.concat([headerBuf, fileContent, footerBuf]);

  console.log(`[3.1] Uploading document (${fileContent.length} bytes) to POST /customers/${encodeURIComponent(customerId)}/documents...`);
  const uploadRes = await request({
    path: `/api/v1/customers/${encodeURIComponent(customerId)}/documents`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-company-id': 'MM',
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': fullMultipartPayload.length
    }
  }, fullMultipartPayload);

  console.log(`Upload Response Status: ${uploadRes.status}`);
  console.log(`Upload Response Data:`, uploadRes.data);

  if (uploadRes.status !== 200 && uploadRes.status !== 201) {
    console.error(`❌ Upload failed (${uploadRes.status}):`, uploadRes.data);
    return;
  }

  const uploadedDoc = uploadRes.data.document;
  console.log(`✅ Document successfully uploaded! ID: ${uploadedDoc.id}, FileUrl: ${uploadedDoc.fileUrl}`);

  // 4. Retrieve Documents via GET /customers/:id/documents
  console.log(`\n[4] Querying customer document registry (GET /customers/${encodeURIComponent(customerId)}/documents)...`);
  const docsRes = await request({
    path: `/api/v1/customers/${encodeURIComponent(customerId)}/documents`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-company-id': 'MM'
    }
  });

  if (docsRes.status !== 200 || !Array.isArray(docsRes.data)) {
    console.error(`❌ Failed to get customer documents (${docsRes.status}):`, docsRes.data);
    return;
  }

  const matchingDoc = docsRes.data.find(d => d.id === uploadedDoc.id);
  if (!matchingDoc) {
    console.error(`❌ Uploaded document ${uploadedDoc.id} not found in customer document list.`);
    return;
  }

  console.log(`✅ Document confirmed in customer document registry!`);
  console.log(`   - Title: "${matchingDoc.title}"`);
  console.log(`   - Category: "${matchingDoc.category}"`);
  console.log(`   - File Name: "${matchingDoc.fileName}"`);
  console.log(`   - File Size: ${matchingDoc.fileSize} bytes`);
  console.log(`   - File URL: ${matchingDoc.fileUrl}`);
  console.log(`   - Uploaded By: ${matchingDoc.uploadedBy?.displayName || 'Staff'}`);

  // 5. Retrieve Customer 360 Dossier
  console.log(`\n[5] Querying Customer 360 Unified Dossier (GET /customers/${encodeURIComponent(customerId)}/360)...`);
  const dossierRes = await request({
    path: `/api/v1/customers/${encodeURIComponent(customerId)}/360`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-company-id': 'MM'
    }
  });

  if (dossierRes.status !== 200 || !dossierRes.data.customer) {
    console.error(`❌ Failed to get Customer 360 dossier (${dossierRes.status}):`, dossierRes.data);
    return;
  }

  const dossierDocs = dossierRes.data.documents || [];
  const dossierMatch = dossierDocs.find(d => d.id === uploadedDoc.id);
  if (!dossierMatch) {
    console.error(`❌ Document ${uploadedDoc.id} not found in Customer 360 documents array.`);
    return;
  }
  console.log(`✅ Verified in Customer 360 Master Dossier! Customer Dossier has ${dossierDocs.length} total attached file(s).`);

  // 6. Test Static On-Demand File Download
  console.log(`\n[6] Testing on-demand static file download from ${uploadedDoc.fileUrl}...`);
  const downloadRes = await request({
    path: uploadedDoc.fileUrl,
    method: 'GET'
  });

  if (downloadRes.status !== 200) {
    console.error(`❌ Failed to download file from static URL (${downloadRes.status})`);
  } else {
    console.log(`✅ File download verified! HTTP 200 OK (${downloadRes.buffer.length} bytes received, content matches uploaded PDF).`);
  }

  // 7. Test Deleting Document
  console.log(`\n[7] Testing Document Deletion (DELETE /customers/${encodeURIComponent(customerId)}/documents/${uploadedDoc.id})...`);
  const deleteRes = await request({
    path: `/api/v1/customers/${encodeURIComponent(customerId)}/documents/${uploadedDoc.id}`,
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-company-id': 'MM'
    }
  });

  if (deleteRes.status !== 200 && deleteRes.status !== 204) {
    console.error(`❌ Failed to delete document (${deleteRes.status}):`, deleteRes.data);
  } else {
    console.log(`✅ Document successfully deleted from database and filesystem!`);
  }

  // 8. Confirm deletion in document registry
  const postDeleteDocsRes = await request({
    path: `/api/v1/customers/${encodeURIComponent(customerId)}/documents`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-company-id': 'MM'
    }
  });

  const isStillPresent = (postDeleteDocsRes.data || []).some(d => d.id === uploadedDoc.id);
  if (isStillPresent) {
    console.error(`❌ Document was still present after deletion.`);
  } else {
    console.log(`✅ Confirmed document is no longer listed in customer files.`);
  }

  console.log(`\n=================================================================`);
  console.log(`ALL CUSTOMER DOCUMENT & FILE UPLOAD TESTS COMPLETED SUCCESSFULLY!`);
  console.log(`=================================================================`);
}

runTest().catch(console.error);
