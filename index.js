const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const VK_API_VERSION = '2023.12.01';
const VK_GROUP_ID = process.env.VK_GROUP_ID;
const VK_GROUP_TOKEN = process.env.VK_GROUP_TOKEN;

app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'MoyMaster Server is running',
    timestamp: new Date().toISOString()
  });
});

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
  
  return ` <b>НОВАЯ ЗАЯВКА #${id}</b>

📍 <b>Район:</b> ${district}
 <b>Категория:</b> ${categoryName}
💰 <b>Бюджет:</b> ${budgetText}

<b>${title}</b>

${description ? `\n📝 <b>Описание:</b>\n${description}` : ''}

━━━━━━━━━━━━━━━━
👉 <b>Откликнуться:</b> https://vk.com/app54718493
 Приложение "Мой Мастер" — поиск мастеров в Барнауле`;
}

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
