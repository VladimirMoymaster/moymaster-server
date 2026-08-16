const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

app.use(cors());
app.use(express.json());

const VK_API_VERSION = '2023.12.01';
const VK_GROUP_ID = process.env.VK_GROUP_ID;
const VK_GROUP_TOKEN = process.env.VK_GROUP_TOKEN;

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MoyMaster Server is running on Vercel',
    timestamp: new Date().toISOString()
  });
});

// Webhook для новых заявок
app.post('/api/new-order', async (req, res) => {
  try {
    console.log('📥 Получена новая заявка:', req.body);
    
    const { id, title, description, budget, district, category_id } = req.body;
    
    const postText = await buildOrderPost(id, title, description, budget, district, category_id);
    const postId = await postToGroup(postText);
    
    console.log(`✅ Пост опубликован: ${postId}`);
    res.json({ success: true, message: 'Post published', post_id: postId });
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Построение текста поста
async function buildOrderPost(id, title, description, budget, district, categoryId) {
  const categories = {
    1: 'Ремонт и строительство',
    2: 'Сантехника',
    3: 'Электрика',
    4: 'Уборка',
    5: 'Грузоперевозки'
  };
  
  const categoryName = categories[categoryId] || 'Другое';
  const budgetText = budget ? `${budget} ₽` : 'Договорная';
  
  // Используем эмодзи вместо HTML тегов
  return `🔨 *НОВАЯ ЗАЯВКА #${id}*

📍 *Район:* ${district}
📋 *Категория:* ${categoryName}
💰 *Бюджет:* ${budgetText}

*${title}*

${description ? `📝 *Описание:*
${description}` : ''}

━━━━━━━━━━━━━━━━
👉 *Откликнуться:* https://vk.com/app54718493
Приложение "Мой Мастер" — поиск мастеров в Барнауле`;
}

// Публикация в группу ВК
async function postToGroup(message) {
  const url = 'https://api.vk.com/method/wall.post';
  
  const params = new URLSearchParams({
    owner_id: VK_GROUP_ID,
    message: message,
    access_token: VK_GROUP_TOKEN,
    v: VK_API_VERSION
  });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`VK API Error: ${data.error.error_msg}`);
  }
  
  return data.response.post_id;
}

// Endpoint для отправки уведомлений
app.post('/api/send-notification', async (req, res) => {
  try {
    console.log('📤 Получен запрос на отправку уведомления:', req.body);
    
    const { user_ids, message } = req.body;
    
    if (!user_ids || !message) {
      return res.status(400).json({ success: false, error: 'Missing user_ids or message' });
    }
    
    // Отправляем уведомление через VK API
    const result = await sendVKNotification(user_ids, message);
    
    console.log('✅ Уведомление отправлено:', result);
    res.json({ success: true, result });
    
  } catch (error) {
    console.error('❌ Ошибка отправки уведомления:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Функция отправки уведомления через VK API
async function sendVKNotification(userIds, message) {
  const url = 'https://api.vk.com/method/messages.send';
  
  const params = new URLSearchParams({
    user_ids: userIds.join(','),  // можно отправить нескольким пользователям
    message: message,
    random_id: Math.floor(Math.random() * 1000000),
    access_token: process.env.VK_COMMUNITY_TOKEN,
    v: '2023.12.01'
  });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`VK API Error: ${data.error.error_msg}`);
  }
  
  return data.response;
}

// Экспортируем app для Vercel
module.exports = app;
