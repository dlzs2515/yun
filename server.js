const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// 1. 配置 SSL 证书（测试用自签名证书，生产环境请用正式证书）
const options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};

// 2. 创建 HTTPS 服务器
const server = https.createServer(options, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server for Cloud Variables\n');
});

// 3. 创建 WSS 服务（挂载到 HTTPS 服务器）
const wss = new WebSocket.Server({ server });

// 4. 内存存储（实际项目应替换为 Redis/数据库）
const cloudVariables = new Map();

// 5. WebSocket 消息处理
wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (data) => {
    try {
      const { action, key, value } = JSON.parse(data.toString());
      
      switch (action) {
        // 存储数据
        case 'set':
          cloudVariables.set(key, value);
          ws.send(JSON.stringify({ status: 'success', action: 'set', key }));
          break;
          
        // 读取数据
        case 'get':
          const result = cloudVariables.has(key) 
            ? { value: cloudVariables.get(key) } 
            : { error: 'Key not found' };
          ws.send(JSON.stringify({ status: 'success', action: 'get', key, ...result }));
          break;
          
        // 删除数据
        case 'delete':
          const deleted = cloudVariables.delete(key);
          ws.send(JSON.stringify({ 
            status: 'success', 
            action: 'delete', 
            key,
            result: deleted ? 'deleted' : 'not_found' 
          }));
          break;
          
        default:
          ws.send(JSON.stringify({ status: 'error', message: 'Invalid action' }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ status: 'error', message: 'Invalid JSON format' }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// 6. 启动服务器
const PORT = 8443;
server.listen(PORT, () => {
  console.log(`WSS Cloud Variables Server running on wss://localhost:${PORT}`);
  console.log('⚠️ 注意：这是测试用自签名证书，生产环境请替换正式证书');
});
