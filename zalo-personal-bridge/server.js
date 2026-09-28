const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const FormData = require('form-data');
const sharp = require('sharp');
const { Zalo, MessageType } = require('zca-js');

const app = express();
app.use(express.json());

const PORT = 5001;
const CHATWOOT_URL = process.env.CHATWOOT_URL || 'http://rails:3000';
const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN || 'AwFHbo4denMgr7yh9u2aHK1D';
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID || '1';
const CREDENTIALS_FILE = path.join(__dirname, 'credentials.json');

let zaloApi = null;
let isConnected = false;
let connectionStatus = '⏳ Đang khởi tạo kết nối Zalo Cá Nhân...';

// Cache chống trùng lặp riêng biệt cho Text và File đính kèm
const processedTextMessages = new Set();
const processedAttachmentMessages = new Set();

// State lưu QR Code đệm cho Puppeteer
let autoQrImage = null;
let isAutoQrRunning = false;

function loadCredentials() {
  if (fs.existsSync(CREDENTIALS_FILE)) {
    try {
      const data = fs.readFileSync(CREDENTIALS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Lỗi đọc file credentials:', e.message);
    }
  }
  return null;
}

function saveCredentials(data) {
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function getZaloInboxId() {
  try {
    const res = await axios.get(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/inboxes`, {
      headers: { 'api_access_token': CHATWOOT_API_TOKEN }
    });
    const inboxes = res.data.payload || res.data || [];
    const personalInbox = inboxes.find(i => i.id === 4 || (i.name && i.name.toLowerCase().includes('cá nhân')));
    if (personalInbox) {
      return personalInbox.id;
    }
  } catch (e) {
    console.error('Lỗi tìm kiếm Inbox Chatwoot:', e.message);
  }
  return 4;
}

// Tối ưu kích thước độ phân giải HD (Tối đa 800px, Giữ nét 90%)
async function optimizeImageForDisplay(buffer, maxDimension = 800) {
  try {
    const resizedBuffer = await sharp(buffer)
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();
    return resizedBuffer;
  } catch (err) {
    console.error('⚠️ [Sharp Optimize Error]:', err.message);
    return buffer;
  }
}

async function downloadAttachment(url) {
  try {
    let fetchUrl = url;
    if (fetchUrl.startsWith('http://') || fetchUrl.startsWith('https://')) {
      fetchUrl = fetchUrl.replace(/^https?:\/\/[^\/]+/, CHATWOOT_URL);
    } else if (fetchUrl.startsWith('/')) {
      fetchUrl = `${CHATWOOT_URL}${fetchUrl}`;
    }
    
    console.log(`📥 [Bridge Download File] Đang tải đính kèm từ: ${fetchUrl}`);
    const response = await axios.get(fetchUrl, { responseType: 'arraybuffer', timeout: 15000 });
    const rawBuffer = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'image/jpeg';

    let finalBuffer = rawBuffer;
    let ext = 'jpg';

    if (contentType.includes('image')) {
      finalBuffer = await optimizeImageForDisplay(rawBuffer, 800);
    } else if (contentType.includes('pdf')) {
      ext = 'pdf';
    }
    
    const tempPath = path.join('/tmp', `att_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`);
    fs.writeFileSync(tempPath, finalBuffer);
    return tempPath;
  } catch (err) {
    console.error('❌ Lỗi tải file đính kèm từ Chatwoot:', err.message);
    return null;
  }
}

// 1. Dashboard Trạng Thái & Hướng Dẫn Kết Nối
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Zalo Personal Bridge for Chatwoot</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; margin: 0; }
        .container { max-width: 720px; margin: 0 auto; background: #1e293b; padding: 32px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.3); }
        h1 { font-size: 24px; color: #38bdf8; margin-top: 0; }
        .status-box { padding: 16px; border-radius: 8px; font-weight: bold; margin-bottom: 24px; background: #334155; }
        .connected { background: #065f46; color: #34d399; }
        .disconnected { background: #881337; color: #fecdd3; }
        .option-box { background: #0f172a; padding: 20px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155; }
        .option-title { font-weight: bold; font-size: 16px; color: #f59e0b; margin-bottom: 8px; }
        .btn { display: inline-block; background: #0284c7; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 8px; }
        .btn-green { background: #10b981; }
        .bookmark-btn { display: inline-block; background: #8b5cf6; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none; cursor: grab; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>💬 Zalo Personal Bridge for Chatwoot</h1>
        
        <div class="status-box ${isConnected ? 'connected' : 'disconnected'}">
          Trạng thái: ${connectionStatus}
        </div>

        ${isConnected ? `
          <div class="option-box">
            <div class="option-title">✅ Đã Kết Nối Thành Công!</div>
            <p style="margin-bottom:16px;">Hệ thống sẵn sàng nhận và phản hồi tin nhắn tự động từ Zalo Cá Nhân (Cá nhân & Nhóm) về Chatwoot.</p>
            <button onclick="window.parent.postMessage('create_zalo_inbox', '*')" style="background:#10b981; color:white; font-weight:bold; font-size:16px; padding:14px 28px; border:none; border-radius:10px; cursor:pointer; width:100%; box-shadow:0 4px 14px rgba(16,185,129,0.4);">
              🚀 HOÀN TẤT &amp; TẠO HỘP THƯ ZALO (TIẾP TỤC ➔)
            </button>
          </div>
        ` : `
          <!-- CÁCH 1: QUÉT QR CODE -->
          <div class="option-box">
            <div class="option-title">✨ Cách 1: Quét Mã QR Trực Tiếp (Không Cần F12)</div>
            <p style="font-size:14px; color:#cbd5e1; line-height:1.5;">Bấm nút bên dưới để hệ thống mở mã QR Zalo trực tiếp trên web này. Bạn chỉ cần dùng điện thoại quét mã QR là xong!</p>
            <a href="/auto-qr" class="btn btn-green">📷 Bắt Đầu Quét Mã QR Zalo Auto</a>
          </div>

          <!-- CÁCH 2: NÚT 1-CLICK DẤU TRANG -->
          <div class="option-box">
            <div class="option-title">⚡ Cách 2: Nút 1-Click Trên Thanh Dấu Trang (Bookmarklet)</div>
            <p style="font-size:14px; color:#cbd5e1; line-height:1.5;">Kéo nút màu tím bên dưới lên <b>Thanh dấu trang (Bookmarks Bar)</b> của trình duyệt. Mỗi lần mở <a href="https://chat.zalo.me" target="_blank" style="color:#38bdf8;">chat.zalo.me</a>, chỉ cần <b>BẤM 1-CLICK</b> vào nút đó là tự động kết nối!</p>
            <a class="bookmark-btn" href="javascript:(function(){const c=document.cookie;const i=localStorage.getItem('z_uuid')||localStorage.getItem('sh_z_uuid');const u=navigator.userAgent;if(!c||!i){alert('Vui lòng đăng nhập Zalo Web trước!');return;}fetch('http://localhost:5001/save-credentials',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cookie:c,imei:i,userAgent:u})}).then(r=>r.text()).then(t=>{alert('✅ Đã kết nối Zalo Cá Nhân thành công với Chatwoot!');window.location.reload();}).catch(e=>alert('❌ Không thể kết nối Bridge: '+e));})();">🚀 Kết Nối Zalo Về Chatwoot</a>
          </div>
        `}

      </div>
    </body>
    </html>
  `);
});

// 2. Trang Quét QR Code Tự Động Với Puppeteer
app.get('/auto-qr', async (req, res) => {
  if (isConnected) {
    return res.redirect('/');
  }

  res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Quét Mã QR Zalo Auto</title>
      <meta http-equiv="refresh" content="3">
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; text-align: center; padding-top: 40px; }
        .qr-card { background: #1e293b; display: inline-block; padding: 24px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); max-width: 400px; }
        img { max-width: 100%; border-radius: 12px; background: white; }
        .btn { display: inline-block; background: #0284c7; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="qr-card">
        <h2>📱 Quét Mã QR Zalo</h2>
        <p style="font-size:14px; color:#cbd5e1;">Mở ứng dụng Zalo trên điện thoại ➔ Chọn <b>Quét Mã QR</b></p>
        ${autoQrImage 
          ? `<img src="${autoQrImage}" alt="Zalo QR" />` 
          : `<p style="padding:40px; color:#f59e0b;">⏳ Đang nạp mã QR Code từ Zalo (Trang tự nạp lại sau 3s)...</p>`
        }
        <br>
        <a href="/" class="btn">⬅️ Quay Lai Trang Chính</a>
      </div>
    </body>
    </html>
  `);

  if (!isAutoQrRunning) {
    startPuppeteerQrScanner();
  }
});

async function startPuppeteerQrScanner() {
  if (isAutoQrRunning || isConnected) return;
  isAutoQrRunning = true;
  autoQrImage = null;
  console.log('🚀 Đang khởi chạy Puppeteer để lấy mã QR Zalo...');

  try {
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.goto('https://id.zalo.me/account?continue=https%3A%2F%2Fchat.zalo.me', { waitUntil: 'networkidle2', timeout: 30000 });

    // Lặp cập nhật QR code mỗi 2 giây & tự động đổi mã khi hết hạn
    const updateQrLoop = setInterval(async () => {
      try {
        // Tự động kiểm tra và bấm nút "Lấy mã mới" nếu QR bị hết hạn
        const reloadBtn = await page.$('.btn-reload') 
                       || await page.$('.qrcode-expired-btn') 
                       || await page.$('.qr-expired-btn')
                       || await page.$('button:has-text("Lấy mã mới")');
        
        if (reloadBtn) {
          console.log('🔄 Mã QR Zalo hết hạn, Puppeteer đang tự động bấm "Lấy mã mới"...');
          await reloadBtn.click();
          await new Promise(r => setTimeout(r, 1000));
        }

        const qrElement = await page.$('.qr-container')
                       || await page.$('.qrcode')
                       || await page.$('svg')
                       || await page.$('canvas')
                       || await page.$('.qrcode-img');

        if (qrElement) {
          const base64Img = await qrElement.screenshot({ encoding: 'base64' });
          autoQrImage = `data:image/png;base64,${base64Img}`;
        }
      } catch (e) {
        // Suppress transient errors during navigation
      }
    }, 2000);

    // Lắng nghe sự kiện sau khi quét thành công
    const checkLogin = setInterval(async () => {
      try {
        const cookies = await page.cookies();
        const hasAuthCookie = cookies.some(c => c.name === 'zpw_sek' || c.name === 'zpw_sek_id');
        let imei = await page.evaluate(() => localStorage.getItem('z_uuid') || localStorage.getItem('sh_z_uuid'));

        if (hasAuthCookie) {
          if (!imei) {
            imei = require('crypto').randomUUID();
          }
          console.log('✅ Đã quét QR thành công trên Puppeteer! Đang trích xuất Cookie & kích hoạt kết nối...');
          clearInterval(checkLogin);
          clearInterval(updateQrLoop);

          const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
          const userAgent = await page.evaluate(() => navigator.userAgent);

          saveCredentials({ cookie: cookieStr, imei, userAgent });
          await initZalo();

          await browser.close();
          isAutoQrRunning = false;
          autoQrImage = null;
        }
      } catch (e) {
        // Suppress browser closing errors
      }
    }, 2000);

  } catch (err) {
    console.error('Lỗi Puppeteer QR Scanner:', err.message);
    isAutoQrRunning = false;
  }
}

// Handler nhận credentials từ Bookmarklet / Form
app.post('/save-credentials', (req, res) => {
  const { cookie, imei, userAgent } = req.body;
  if (cookie && imei) {
    saveCredentials({ cookie, imei, userAgent });
    initZalo();
    return res.status(200).send('OK');
  }
  res.status(400).send('Missing params');
});

// 3. Hàm đăng nhập và lắng nghe tin nhắn Zalo
async function initZalo() {
  const creds = loadCredentials();
  if (!creds || !creds.cookie || !creds.imei) {
    connectionStatus = '❌ Chưa cấu hình Cookie & IMEI Zalo. Vui lòng chọn 1 trong 2 cách bên dưới để kết nối.';
    console.log(connectionStatus);
    return;
  }

  connectionStatus = '⏳ Đang đăng nhập Zalo Cá Nhân...';
  console.log(connectionStatus);

  try {
    const zalo = new Zalo(
      {
        cookie: creds.cookie,
        imei: creds.imei,
        userAgent: creds.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      {
        selfListen: false,
        checkUpdate: false,
      }
    );

    zaloApi = await zalo.login();
    isConnected = true;
    connectionStatus = '✅ Đã Kết Nối Zalo Cá Nhân Thành Công!';
    console.log(connectionStatus);

    zaloApi.listener.on('message', async (message) => {
      console.log('📩 [Zalo Raw Message Event]:', JSON.stringify(message));

      if (message.isSelf) return;

      const isGroup = message.type === MessageType.GroupMessage || message.type === 1 || message.isGroup || (message.threadId && message.data?.uidFrom && message.threadId !== message.data?.uidFrom);
      const threadId = message.threadId || message.data?.fromId || message.data?.uidFrom || message.uidFrom;
      if (!threadId) return;

      const memberId = message.data?.uidFrom || message.data?.fromId;
      const memberName = message.data?.displayName || message.data?.dName || message.data?.name || `Thành viên ${String(memberId || '').slice(-4)}`;

      const identifierPrefix = isGroup ? 'zalo_group_' : 'zalo_';
      const contactIdentifier = `${identifierPrefix}${threadId}`;

      const rawContent = message.data?.content || message.data?.msg || message.data?.message || (typeof message.data === 'string' ? message.data : null);

      // Kiểm tra xem tin nhắn Zalo đến có chứa Hình ảnh không (href / thumb / url)
      let imageUrl = null;
      if (typeof rawContent === 'object' && rawContent !== null) {
        imageUrl = rawContent.href || rawContent.thumb || rawContent.url;
      }
      if (!imageUrl && message.data?.href) imageUrl = message.data.href;
      if (!imageUrl && message.data?.url) imageUrl = message.data.url;
      if (!imageUrl && message.data?.thumb) imageUrl = message.data.thumb;

      let textContent = typeof rawContent === 'string' ? rawContent : (rawContent?.title || rawContent?.description || '');
      if (isGroup && textContent) {
        textContent = `${memberName}: ${textContent}`;
      }

      // Lấy tên thật Zalo & Avatar từ Zalo API
      let senderName = memberName;
      let avatarUrl = null;
      let phoneNumber = null;

      try {
        if (isGroup && zaloApi.getGroupInfo) {
          const groupRes = await zaloApi.getGroupInfo(threadId);
          const groupInfo = groupRes?.gridInfoMap?.[threadId] || groupRes?.groupInfo || groupRes;
          if (groupInfo?.name) {
            senderName = `[Nhóm Zalo] ${groupInfo.name}`;
          } else {
            senderName = `[Nhóm Zalo ${String(threadId).slice(-4)}]`;
          }
          avatarUrl = groupInfo?.avt || groupInfo?.fullAvt || null;
        } else if (!isGroup && zaloApi.getUserInfo) {
          const userRes = await zaloApi.getUserInfo(threadId);
          const profile = userRes?.changed_profiles?.[threadId] || userRes?.profiles?.[threadId];
          if (profile) {
            senderName = profile.displayName || profile.zaloName || senderName;
            avatarUrl = profile.avatar;
            if (profile.phoneNumber) {
              phoneNumber = '+' + profile.phoneNumber;
            }
          }
        }
      } catch (errInfo) {
        if (isGroup) {
          senderName = `[Nhóm Zalo ${String(threadId).slice(-4)}]`;
        }
      }

      console.log(`📩 [Zalo Inbound] [${senderName} (${contactIdentifier})] ${imageUrl ? '[Hình ảnh: ' + imageUrl + ']' : ''}: ${textContent}`);

      try {
        const targetInboxId = await getZaloInboxId();

        // 1. Create or Update Contact với tên Nhóm hoặc tên người gửi Zalo
        let contactId;
        try {
          const searchRes = await axios.get(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/search?q=${contactIdentifier}`, {
            headers: { 'api_access_token': CHATWOOT_API_TOKEN }
          });
          contactId = searchRes.data?.payload?.[0]?.id;
        } catch (errSearch) {
          // Ignore
        }

        if (contactId) {
          try {
            await axios.put(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contactId}`, {
              name: senderName,
              avatar_url: avatarUrl || undefined,
              phone_number: phoneNumber || undefined
            }, {
              headers: { 'api_access_token': CHATWOOT_API_TOKEN }
            });
          } catch (eUpdate) {
            // Ignore update errors
          }
        } else {
          const contactRes = await axios.post(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts`, {
            name: senderName,
            identifier: contactIdentifier,
            avatar_url: avatarUrl || undefined,
            phone_number: phoneNumber || undefined
          }, {
            headers: { 'api_access_token': CHATWOOT_API_TOKEN }
          });
          contactId = contactRes.data?.payload?.contact?.id || contactRes.data?.id;
        }

        if (!contactId) {
          console.error('❌ Không thể tạo/tìm thấy Contact ID cho Zalo:', threadId);
          return;
        }

        // 2. Tìm lại cuộc hội thoại đang mở/hiện có thay vì tạo mới
        let conversationId;
        try {
          const convListRes = await axios.get(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/contacts/${contactId}/conversations`, {
            headers: { 'api_access_token': CHATWOOT_API_TOKEN }
          });
          const existingConvs = convListRes.data?.payload || convListRes.data || [];
          const matchedConv = existingConvs.find(c => c.inbox_id === targetInboxId && c.status !== 'resolved') || existingConvs.find(c => c.inbox_id === targetInboxId);
          if (matchedConv) {
            conversationId = matchedConv.id;
          }
        } catch (errConvList) {
          // Ignore
        }

        if (!conversationId) {
          const convRes = await axios.post(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations`, {
            source_id: contactIdentifier,
            inbox_id: targetInboxId,
            contact_id: contactId
          }, {
            headers: { 'api_access_token': CHATWOOT_API_TOKEN }
          });
          conversationId = convRes.data?.id;
        }

        // 3. Tối ưu ảnh Zalo về độ phân giải HD chuẩn xem trước
        if (imageUrl) {
          try {
            console.log(`📥 [Zalo Inbound Image] Đang tải ảnh từ Zalo CDN: ${imageUrl}`);
            const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 15000 });
            const rawImgBuffer = Buffer.from(imgRes.data);

            const optimizedBuffer = await optimizeImageForDisplay(rawImgBuffer, 800);

            const tempFile = path.join('/tmp', `zalo_in_${Date.now()}.jpg`);
            fs.writeFileSync(tempFile, optimizedBuffer);

            const form = new FormData();
            form.append('content', isGroup ? `${memberName} đã gửi 1 hình ảnh:` : (textContent || ''));
            form.append('message_type', 'incoming');
            form.append('attachments[]', fs.createReadStream(tempFile));

            await axios.post(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`, form, {
              headers: {
                'api_access_token': CHATWOOT_API_TOKEN,
                ...form.getHeaders()
              }
            });
            console.log(`➡️ [Zalo Inbound Image] Đã đẩy HÌNH ẢNH (${optimizedBuffer.length} bytes) từ [${senderName}] vào Conversation #${conversationId} thành công!`);
            try { fs.unlinkSync(tempFile); } catch (e) {}
          } catch (errImg) {
            console.error('❌ Lỗi tải hình ảnh Zalo về Chatwoot:', errImg.message);
            await axios.post(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`, {
              content: textContent ? `${textContent}\n${imageUrl}` : imageUrl,
              message_type: 'incoming'
            }, {
              headers: { 'api_access_token': CHATWOOT_API_TOKEN }
            });
          }
        } else if (textContent) {
          await axios.post(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/messages`, {
            content: textContent,
            message_type: 'incoming'
          }, {
            headers: { 'api_access_token': CHATWOOT_API_TOKEN }
          });
          console.log(`➡️ Đã đẩy tin nhắn từ [${senderName}] vào Conversation #${conversationId} (Inbox #${targetInboxId}) thành công!`);
        }
      } catch (err) {
        console.error('❌ Lỗi đẩy tin nhắn về Chatwoot:', err.response?.data || err.message);
      }
    });

    zaloApi.listener.start();
  } catch (error) {
    isConnected = false;
    connectionStatus = `❌ Đăng nhập thất bại: ${error.message}`;
    console.error(connectionStatus);
  }
}

// 4. Webhook từ Chatwoot để gửi tin phản hồi về Zalo
app.post('/chatwoot-webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    const event = payload.event || '';
    const bodyMsg = payload.message || (payload.messages && payload.messages[0]) || {};
    
    const msgType = payload.message_type || bodyMsg.message_type;
    const isOutgoing = msgType === 'outgoing' || msgType === 1 || bodyMsg.message_type === 'outgoing' || bodyMsg.message_type === 1;

    if (!isOutgoing && event !== 'message_created') {
      return res.status(200).json({ status: 'ignored', reason: 'not_outgoing' });
    }

    const messageId = String(bodyMsg.id || payload.id || req.headers['x-chatwoot-delivery'] || Date.now());
    
    const contactIdentifier = payload.conversation?.contact_inbox?.source_id
                           || bodyMsg.conversation?.contact_inbox?.source_id
                           || payload.meta?.sender?.custom_attributes?.zalo_user_id
                           || payload.meta?.sender?.identifier
                           || payload.conversation?.meta?.sender?.identifier;

    const msgContent = payload.content || bodyMsg.content || '';
    const attList = payload.attachments || bodyMsg.attachments || [];

    const isGroup = contactIdentifier ? contactIdentifier.includes('zalo_group_') : false;
    const zaloTargetId = contactIdentifier ? contactIdentifier.replace('zalo_group_', '').replace('zalo_', '') : null;
    const targetType = isGroup ? MessageType.GroupMessage : MessageType.DirectMessage;

    console.log(`📤 [Chatwoot Outbound Triggered] Target: ${zaloTargetId}, Content: "${msgContent}", Attachments: ${attList.length}`);

    if (zaloTargetId && zaloApi) {
      if (attList && attList.length > 0 && !processedAttachmentMessages.has(messageId)) {
        processedAttachmentMessages.add(messageId);
        const localAttachmentPaths = [];
        for (const att of attList) {
          const fileUrl = att.data_url || att.thumb_url || att.url;
          if (fileUrl) {
            const localPath = await downloadAttachment(fileUrl);
            if (localPath) localAttachmentPaths.push(localPath);
          }
        }
        if (localAttachmentPaths.length > 0) {
          await zaloApi.sendMessage(
            { msg: msgContent, attachments: localAttachmentPaths },
            zaloTargetId,
            targetType
          );
          console.log(`✅ [Zalo Send Success] Đã gửi hình ảnh thành công tới ${zaloTargetId}`);
          for (const p of localAttachmentPaths) {
            try { fs.unlinkSync(p); } catch (e) {}
          }
        }
      } else if (msgContent && !processedTextMessages.has(messageId)) {
        processedTextMessages.add(messageId);
        await zaloApi.sendMessage(
          { msg: msgContent },
          zaloTargetId,
          targetType
        );
        console.log(`✅ [Zalo Send Success] Đã gửi tin nhắn văn bản thành công tới ${zaloTargetId}`);
      }
    }

    return res.status(200).json({ status: 'success' });
  } catch (err) {
    console.error('❌ Lỗi xử lý Webhook gửi tin Zalo:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🌐 Zalo Personal Bridge đang lắng nghe tại cổng ${PORT}`);
  console.log(`👉 Mở trình duyệt truy cập: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
  initZalo();
});
