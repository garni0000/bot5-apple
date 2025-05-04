const http = require('http');
const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');

const token = '8075874480:AAFymYS-clEN1hfdcrV7e0ZfvX9MyQOJngY';
const bot = new TelegramBot(token, { polling: true });
const mongoUrl = 'mongodb+srv://josh:JcipLjQSbhxbruLU@cluster0.hn4lm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(mongoUrl);

// Configuration
const channelIds = [-1002191790432];
const freeSequenceLimit = 5;
const requiredReferrals = 5;
const signalInterval = 2 * 5 * 1000; // 2 minutes
const videoUrl = 'https://t.me/gsgzheh/3'; // Lien de la vidéo

// Liste des administrateurs (remplacez par les ID des administrateurs)
const ADMIN_IDS = [1613186921, 987654321]; // Exemple d'ID admin

// Connexion à MongoDB
async function connectDB() {
  try {
    await client.connect();
    console.log('✅ Connecté à MongoDB');
  } catch (error) {
    console.error('❌ Erreur MongoDB:', error);
  }
}
connectDB();

// Fonctions DB
async function getUser(chatId) {
  const db = client.db('apple_hack');
  return await db.collection('usersb').findOne({ chatId });
}

async function updateUser(chatId, update) {
  const db = client.db('apple_hack');
  const updateQuery = Object.keys(update).some(key => key.startsWith('$')) ? update : { $set: update };
  await db.collection('usersb').updateOne({ chatId }, updateQuery, { upsert: true });
}

// Récupérer tous les utilisateurs
async function getAllUsers() {
  const db = client.db('apple_hack');
  return await db.collection('usersb').find({}).toArray();
}

// Génération du signal
function generateAppleSequence() {
  const header = `🔔 CONFIRMED ENTRY!\n🍎 Apple : 3\n🔐 Attempts: 4\n⏰ Validity: 5 minutes\n\n`;
  const numbers = ["2.41", "1.93", "1.54", "1.23"];
  const lines = numbers.map(num => {
    const icons = Array(5).fill("🟩");
    const appleIndex = Math.floor(Math.random() * 5);
    icons[appleIndex] = "🍎";
    return `${num}:${icons.join('')}`;
  });
  return header + lines.join("\n");
}

// Vérification des canaux
async function verifyChannels(chatId) {
  for (const channelId of channelIds) {
    try {
      const member = await bot.getChatMember(channelId, chatId);
      if (!['creator', 'administrator', 'member'].includes(member.status)) return false;
    } catch (error) {
      console.error(`Erreur canal ${channelId}:`, error);
      return false;
    }
  }
  return true;
}

// Commande /start
bot.onText(/\/start(?:\s(\d+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const referrerId = match[1] ? Number(match[1]) : null;
  const existingUser = await getUser(chatId);
  if (!existingUser) {
    await updateUser(chatId, { sequencesUsed: 0, pro: false, referrer: referrerId, referrals: 0, lastSignalTime: 0 });
    if (referrerId && referrerId !== chatId) {
      const referrer = await getUser(referrerId);
      if (referrer) {
        await updateUser(referrerId, { $inc: { referrals: 1 } });
        const updatedReferrer = await getUser(referrerId);
        const remainingReferrals = requiredReferrals - updatedReferrer.referrals;
        if (remainingReferrals > 0) {
          bot.sendMessage(referrerId, `🎉 Un nouvel utilisateur a utilisé votre lien de parrainage ! Il vous reste ${remainingReferrals} invitations pour débloquer la version PRO.`);
        } else {
          bot.sendMessage(referrerId, '🎉 Félicitations ! Vous avez débloqué la version PRO !');
          await updateUser(referrerId, { pro: true });
        }
      }
    }
  }
  bot.sendMessage(chatId, 'Bienvenue dans le hack Apple of Fortune! Cliquez sur check ✅ après avoir rejoint les canaux.', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Canal 1 📢', url: 'https://t.me/+JQL79P4dVmExZWM0' },
          { text: 'Canal 2 📢', url: 'https://t.me/+frZL1gatT5oxMWM0' }
        ],
        [{ text: 'check ✅', callback_data: 'check_channels' }]
      ]
    }
  });
});

// Gestion des callback_query
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const user = await getUser(chatId);
  switch (query.data) {
    case 'check_channels':
      if (await verifyChannels(chatId)) {
        await bot.sendMessage(chatId, '✅ Canaux vérifiés !\n\nPour profiter des hacks, veuillez créer un compte authentique en utilisant le code promo Free221 pour connecter le bot aux algorithmes.\n\nVeuillez regarder ce tutoriel 👇 :');
        setTimeout(async () => {
          await bot.sendVideo(chatId, videoUrl, {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Suivant ➡️', callback_data: 'ask_1xbet_code' }]
              ]
            }
          });
        }, 2000);
      } else {
        await bot.sendMessage(chatId, '❌ Rejoignez tous les canaux d\'abord !', {
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Canal 1 📢', url: 'https://t.me/+JQL79P4dVmExZWM0' },
                { text: 'Canal 2 📢', url: 'https://t.me/+frZL1gatT5oxMWM0' }
              ],
              [{ text: 'Vérifier à nouveau ✅', callback_data: 'check_channels' }]
            ]
          }
        });
      }
      break;
    case 'ask_1xbet_code':
      await bot.sendMessage(chatId, 'Veuillez envoyer votre Id  (1xbet\/linebet) pour continuer.');
      break;
    case 'get_signal':
      if (!(await verifyChannels(chatId))) {
        return bot.sendMessage(chatId, '❌ Vous devez rejoindre les canaux pour utiliser le bot !', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Vérifier les canaux ✅', callback_data: 'check_channels' }]
            ]
          }
        });
      }
      if (Date.now() - user.lastSignalTime < signalInterval) {
        await bot.sendMessage(chatId, `⏳ Attendez encore ${Math.ceil((signalInterval - (Date.now() - user.lastSignalTime)) / 60000)} minute(s) !`);
      } else if (user.pro || user.sequencesUsed < freeSequenceLimit) {
        await bot.sendMessage(chatId, generateAppleSequence(), {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Next 🔄', callback_data: 'get_signal' }],
              [{ text: 'Menu principal 🏠', callback_data: 'check_channels' }]
            ]
          }
        });
        await updateUser(chatId, { sequencesUsed: user.sequencesUsed + 1, lastSignalTime: Date.now() });
      } else {
        await bot.sendMessage(chatId, '🚫 Essai gratuit terminé. Passez à PRO !', {
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Acheter PRO (100★)', callback_data: 'buy_pro' }],
              [{ text: 'Parrainer des amis 👥', callback_data: 'share_invite' }]
            ]
          }
        });
      }
      break;
    case 'share_invite':
      await bot.sendMessage(chatId, `📨 Partagez votre lien de parrainage pour débloquer le PRO :\nhttps://t.me/addconfigbot?start=${chatId}`);
      break;
    case 'buy_pro':
      await bot.sendInvoice(
        chatId,
        'Version PRO AppleXfortun',
        'Accès illimité aux signaux premium',
        JSON.stringify({ type: 'pro_version', userId: chatId }),
        'PROVIDER_TOKEN_ICI',
        'XTR',
        [{ label: '100 Étoiles Telegram', amount: 100 }]
      );
      break;
  }
  await bot.answerCallbackQuery(query.id);
});

// Gestion du code 1xbet
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  if (/^\d{10}$/.test(text)) {
    const code = parseInt(text, 10);
    if (code >= 1000000000 && code <= 1999999999) {
      await bot.sendMessage(chatId, '✅ id valide !', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Obtenir le signal 🍎', callback_data: 'get_signal' }]
          ]
        }
      });
    } else {
      await bot.sendMessage(chatId, '❌ Code refusé. Veuillez entrer un code valide.');
    }
  }
});

// Section Admin
bot.onText(/\/adminstats/, async (msg) => {
  const chatId = msg.chat.id;
  if (!ADMIN_IDS.includes(chatId)) {
    return bot.sendMessage(chatId, '❌ Vous n\'avez pas la permission d\'utiliser cette commande.');
  }

  const db = client.db('apple_hack');
  const users = await db.collection('usersb').find({}).toArray();
  const totalUsers = users.length;
  const totalReferrals = users.reduce((sum, user) => sum + (user.referrals || 0), 0);

  bot.sendMessage(chatId, `📊 Statistiques Admin :\n\n👤 Utilisateurs totaux : ${totalUsers}\n🔗 Références totales : ${totalReferrals}`);
});







bot.onText(/\/broadcast/, async (msg) => {
  const chatId = msg.chat.id;

  // Vérification des permissions
  if (!ADMIN_IDS.includes(chatId)) {
    return bot.sendMessage(chatId, '❌ Vous n\'avez pas la permission d\'utiliser cette commande.');
  }

  // Vérification du message auquel on répond
  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, '❌ Répondez à un message avec /broadcast pour l\'envoyer à tous les utilisateurs.');
  }

  const users = await getAllUsers();
  const originalMessage = msg.reply_to_message;
  let successCount = 0;
  let failCount = 0;

  // Fonction pour envoyer le message selon son type
  const sendMessage = async (userChatId) => {
    try {
      if (originalMessage.text) {
        // Message texte simple
        await bot.sendMessage(userChatId, originalMessage.text, {
          parse_mode: originalMessage.parse_mode,
          entities: originalMessage.entities
        });
      } else if (originalMessage.photo) {
        // Photo avec légende
        await bot.sendPhoto(userChatId, originalMessage.photo[originalMessage.photo.length - 1].file_id, {
          caption: originalMessage.caption,
          parse_mode: originalMessage.parse_mode,
          caption_entities: originalMessage.caption_entities
        });
      } else if (originalMessage.video) {
        // Vidéo avec légende
        await bot.sendVideo(userChatId, originalMessage.video.file_id, {
          caption: originalMessage.caption,
          parse_mode: originalMessage.parse_mode,
          caption_entities: originalMessage.caption_entities
        });
      } else if (originalMessage.document) {
        // Document avec légende
        await bot.sendDocument(userChatId, originalMessage.document.file_id, {
          caption: originalMessage.caption,
          parse_mode: originalMessage.parse_mode,
          caption_entities: originalMessage.caption_entities
        });
      } else if (originalMessage.audio) {
        // Audio avec légende
        await bot.sendAudio(userChatId, originalMessage.audio.file_id, {
          caption: originalMessage.caption,
          parse_mode: originalMessage.parse_mode,
          caption_entities: originalMessage.caption_entities
        });
      } else if (originalMessage.voice) {
        // Message vocal
        await bot.sendVoice(userChatId, originalMessage.voice.file_id, {
          caption: originalMessage.caption,
          parse_mode: originalMessage.parse_mode,
          caption_entities: originalMessage.caption_entities
        });
      } else if (originalMessage.sticker) {
        // Sticker
        await bot.sendSticker(userChatId, originalMessage.sticker.file_id);
      } else {
        // Type de média non supporté
        throw new Error('Type de média non supporté');
      }
      successCount++;
    } catch (err) {
      console.error(`❌ Erreur lors de l'envoi à ${userChatId}:`, err.message);
      failCount++;
    }
  };

  // Envoi à tous les utilisateurs
  for (const user of users) {
    await sendMessage(user.chatId);
  }

  // Rapport d'envoi
  const report = `✅ Diffusion terminée :
- Envoyés avec succès: ${successCount}
- Échecs: ${failCount}
- Total: ${users.length}`;

  bot.sendMessage(chatId, report);
});




// Serveur HTTP
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('🤖 Bot en ligne');
});
server.listen(process.env.PORT || 3000, () => {
  console.log('🚀 Serveur démarré sur', process.env.PORT || 3000);
});
