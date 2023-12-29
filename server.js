const http = require("http");

const PORT = 3001;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { url, method } = req;

  if (url !== "/" || method !== "GET") {
    res.writeHead(404).end();
    return;
  }

  let data = [];

  for (let i = 0; i < 20; i++) {
    const x = i.toString();
    const value = Math.round(Math.random() * 1000);

    data.push({ x, value });
  }

  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ data }));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
