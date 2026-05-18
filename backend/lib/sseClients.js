// Keeps track of every browser currently viewing the public gallery.
// When a new upload finishes, we call broadcast() to notify all of them.

const clients = new Set();

function addClient(res) {
  clients.add(res);
}

function removeClient(res) {
  clients.delete(res);
}

function broadcast(event, data = {}) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

module.exports = { addClient, removeClient, broadcast };
