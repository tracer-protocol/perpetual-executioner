const fetch = require('node-fetch');

const sendMessageToDiscord = async (message) => {
  const webhookUrl = process.env.DISCORD_ALERTS_WEBHOOK_URL;

  try {
    if (!webhookUrl) {
      throw new Error('process.env.DISCORD_ALERTS_WEBHOOK_URL is missing');
    }

    const response = await fetch(webhookUrl, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: message
      })
    });

    if (!response.ok) {
      const responseBody = await response.text()
      console.error(
        `Non ok response from discord sending ${message}`,
        JSON.stringify(responseBody, null, 2)
      );
    }
  } catch (error) {
    console.error('Failed to send message to discord', error.message);
  }
}

module.exports = {
  sendMessageToDiscord
}