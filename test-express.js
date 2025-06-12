const express = require('express');
const app = express();
app.use(express.json());
app.get('/test', (req, res) => res.json({ok: true}));
const server = app.listen(3001, () => console.log('Test sur port 3001'));
setTimeout(() => server.close(), 2000);
