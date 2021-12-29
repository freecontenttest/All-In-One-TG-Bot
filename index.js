const { Telegraf } = require('telegraf');
require('dotenv').config();
const bot = new Telegraf(process.env.BOT_TOKEN);

const axios = require('axios');
axios.defaults.headers.common['X-XSRF-TOKEN'] = process.env.AXIOS_TOKEN;
axios.defaults.headers.common['Cookie'] = process.env.COOKIE;

const express = require('express');
const app = express();

const Telegraph = require('telegra.ph');
const telegraphClient = new Telegraph(process.env.TELEGRAPH_TOKEN);

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

app.get('/', (req, res) => {
    res.send('Bot is working now !!')
});

app.listen(process.env.PORT || 5000);

var TIMEOUT_MILLISECONDS = 21600000;
var TIMEOUT_SECONDS = 21600;
var postsStack = [];
var last_item_id = [];
var DEF_CAPTION = '🔰  *HOW TO DOWNLOAD* :\n\n➤  _Just Install PLAYit App from PlayStore_\n➤  🚀 _High Speed Download & No Buffering_\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📥 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐋𝐢𝐧𝐤𝐬/👀𝐖𝐚𝐭𝐜𝐡 𝐎𝐧𝐥𝐢𝐧𝐞\n\n\n';
var pageCounter = 0;
var customCounter = 0;
var current_pdisk_account = 'online_contents';
var TO_CHANNEL = -1001333034093;

/*
Functions
*/

function getFromId (ctx) {
    if (ctx.message) {
        return ctx.message.from.id
    } else if (ctx.callbackQuery) {
        return ctx.callbackQuery.from.id
    } else if (ctx.inlineQuery) {
        return ctx.inlineQuery.from.id
    } else {
        return null
    }
};

function notAllowedMessage (ctx) {
    if (ctx.updateType == 'message') {
        return ctx.reply('⚠️  You\'re not allowed 🚫️ to message !!!');
    } else if (ctx.updateType == 'callback_query') {
        return ctx.telegram.answerCbQuery(ctx.callbackQuery.id, '⚠️  You\'re not allowed 🚫️ to choose option', true);
    } else if (ctx.updateType == 'inline_query') {
        const results = [{
            type: 'photo',
            id: 1,
            photo_url: 'https://cdn.pixabay.com/photo/2012/04/24/12/29/no-symbol-39767_640.png',
            thumb_url: 'https://cdn.pixabay.com/photo/2012/04/24/12/29/no-symbol-39767_640.png',
            caption: '⚠️  Your\'re not allowed 🚫️ to search anything !!'
        }];
        return ctx.answerInlineQuery(results);
    }
};

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " hour " : " hours ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute " : " minutes ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second " : " seconds ") : "";

    if (hDisplay && mDisplay && sDisplay) return hDisplay + ', ' + mDisplay + ', ' + sDisplay;
    if (hDisplay && mDisplay) return hDisplay + ', ' + mDisplay;
    if (hDisplay && sDisplay) return hDisplay + ', ' + sDisplay
    if (mDisplay && sDisplay) return mDisplay + ', ' + sDisplay;
    if (hDisplay) return hDisplay;
    if (mDisplay) return mDisplay;
    if (sDisplay) return sDisplay;
    
    return 0 + ' ' + 'second';
};

function startCountDown(msgID) {
    let timeleft = TIMEOUT_SECONDS;

    let newMsg = { msgID: msgID, counter: 'Counting...' };

    let downloadTimer = setInterval(function () {
        if (timeleft <= 0) {
            clearInterval(downloadTimer);
            newMsg.counter = "Message is Deleted.";
        } else {
            newMsg.counter = '⚠️ ' + secondsToHms(timeleft) + "remaining to be removed this message.";
        }
        timeleft -= 1;
    }, 1000);
    postsStack.push(newMsg);
};

function checkMsgType(ctx) {
    if (ctx.chat.id == '-1001518585169') return 'sendAnimation';


    if (ctx.message.reply_to_message && ctx.message.reply_to_message.photo) {
        return 'sendPhoto'
    } else if (ctx.message.reply_to_message && ctx.message.reply_to_message.animation) {
        return 'sendAnimation'
    } else if (ctx.message.reply_to_message && ctx.message.reply_to_message.document) {
        return 'sendDocument'
    } else return 'sendPhoto';
};

async function getPdiskLink(url, title, description) {
    const response = await axios.post('https://www.pdisk.net/api/ndisk_manager/video/create', {
        content_src: url,
        description: description || "Uploaded By @premuimvideo_officials",
        dir_id: "0",
        link_type: "link",
        source: 2000,
        title: title || "Telegram : @my_channels_list_official",
        uid: current_pdisk_account === 'online_contents' ? "79542932" : "42211234"
    });

    if (!response.data.isSuccess) {
        return { error: response.data.msg };
    };

    const newlink = await axios.post(`https://www.pdisk.net/api/ndisk-api/content/gen_link?itemId=${response.data.data.item_id}`);
    return { newURL: newlink.data.data.url, item_id: String(response.data.data.item_id) };
};

async function getDetailsFromId (id) {
    const searchByIdUrl = `https://www.pdisk.net/api/video/search-my-video?dir_id=0&item_id=${id}&title=&pageSize=10&pageNo=1&desc=&status=&sortField=ctime&sortAsc=0&needDirName=true`;
    const res = await axios.get(searchByIdUrl);
    if (res.data.isSuccess && res.data.data.total > 0) {
        return res.data.data.list[0].cover_url;
    } else {
        return 'error';
    };
};

function getTelegraphFormattedContent (value) {

    const node_value = value.split(', ');

    const method = node_value.length == 4 ? 'create' : 'edit' ; // 4 for create; 5 for edit
    const url = method == 'create' ? node_value[1] : node_value[2];
    const path = method == 'edit' ? node_value[1].split('.ph/')[1] : null;
    const url_file_size = method == 'create' ? node_value[2] : node_value[3];
    const star_cast = method == 'create' ? node_value[3] : node_value[4] || 'Uploaded By @premuimvideo_officials';

    let whichTag;

    if (url.includes('.jpg')) {
        whichTag = 'img';
    } else if (url.includes('.mp4')) {
        whichTag = 'video'
    }  else whichTag = 'video';

    if (!whichTag) return;

    const content = [
        {
            "tag": "figure",
            "children": [
                {
                    "tag": `${whichTag}`,
                    "attrs": { "src": `${url}` }
                },
                {
                    "tag": "figcaption",
                    "children": [`🎬 Preview Video Size: ${url_file_size} MB\n👯️ Star Cast: ${star_cast}`]
                }
            ]
        },
        {
            "tag": "strong",
            "children": ["💠 Backup Channel :\n"]
        },
        {
            "tag": "a",
            "attrs": { "href": "https://t.me/joinchat/ojOOaC4tqkU5MTVl" },
            "children": [" ➤ https://t.me/joinchat/ojOOaC4tqkU5MTVl \n\n"]
        },
        {
            "tag": "strong",
            "children": ["♻️ Other Channels \n"]
        },
        {
            "tag": "a",
            "attrs": { "href": "https://t.me/my_channels_list_official" },
            "children": [" ➤ https://t.me/my_channels_list_official"]
        }
    ];

    return method == 'create' ? content : { content: content, path: path };
};

function get_cookies () {
    return axios.defaults.headers.common['Cookie'] || 'Not Found !!';
};

function get_xsrf () {
    return axios.defaults.headers.common['X-XSRF-TOKEN'] || 'Not Found !!';
};

async function set_cookie (ID) {
    const params = { "userName": process.env[`${ID}_USERNAME`], "password": process.env[`${ID}_PASSWORD`] };
    try {
        const res = await axios.post('https://www.pdisk.net/api/fleets_accounts/account/pwd_login', params);
        const cookies = res.headers['set-cookie'];
        const arrayOfCookies = cookies.map(cookie => cookie.split(';')[0]);
        
        const xsrf_token = arrayOfCookies.filter(cookie => cookie.includes('csrfToken='));
        axios.defaults.headers.common['X-XSRF-TOKEN'] = xsrf_token[0].split('csrfToken=')[1];
        
        var set_cookies = arrayOfCookies.join('; ');
        axios.defaults.headers.common['Cookie'] = set_cookies;
        return `Successfully set cookies\n\n\`${get_cookies()}\``;
    } catch (error) {
        return error;
    };
};

/*
Bot
*/

bot.use((ctx, next) => {
    const fromId = getFromId(ctx);
    if(!fromId) return;
    if (process.env.SUDO_USERS == fromId) return next();
    notAllowedMessage(ctx);
});

bot.catch((err, ctx) => {
    console.log('-bot-errro==>', err)
    const fromId = getFromId(ctx);
    if(!fromId) return;
    if (process.env.SUDO_USERS != fromId) return;
    let mainError;
    if (err.description) mainError = err.description.split(': ')[1];
    else if (typeof(err) == 'string'){
        mainError = err.split(': ')[1];
    }
    if(!mainError) return;
    ctx.reply(mainError);
});

bot.start((ctx) => {
    ctx.reply('Hi !!\n\nWelcome To All In One Bot \nOfficial bot of @temp_demo');
});

bot.command('set_timeout', (ctx) => {
    const newTimeOut = ctx.update.message.text.split('/set_timeout ');
    const seconds = newTimeOut[1];
    TIMEOUT_SECONDS = seconds;
    const FinalTimeOut = secondsToHms(seconds);
    TIMEOUT_MILLISECONDS = seconds * 1000;
    ctx.reply(`Your Timeout Is Set To ${FinalTimeOut}`);
});

bot.on(['video'], (ctx) => {
    console.log('ctx  ***', ctx); //
    console.log('ctx *** messages ***', ctx.message); //
    ctx.reply(ctx.message.video.file_name);
    




    // -1001518585169 --> 'Video Forwarder' | -1001478813743 --> 'Search Pdisk'
    if (ctx.chat.id == '-1001478813743' || ctx.chat.id == '-1001518585169') return;
    if (!TO_CHANNEL) return ctx.reply('Add To Channel first');
    if (ctx.message.photo) {
        const photoID = ctx.message.photo[ctx.message.photo.length - 1].file_id;
        ctx.telegram.sendPhoto(TO_CHANNEL, photoID, {
            caption: ctx.message.caption,
            caption_entities: ctx.message.caption_entities || [],
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Enable Self Delete  ✅️", callback_data: 'yesEnable' },
                        { text: "Disable Self Delete  ❌️", callback_data: 'cancelEnable' }
                    ]
                ]
            }
        });
        return
    }

    if (ctx.message.video) {
        if (ctx.chat.id == '-1001478813743') return;
        const videoID = ctx.message.video.file_id;
        const chat_id = -1001537843156 || ctx.chat.id // This patch must needs to be fixed.
        ctx.telegram.sendVideo(chat_id, videoID, {
            caption: ctx.message.caption,
            caption_entities: ctx.message.caption_entities || [],
            reply_markup: {
                inline_keyboard: [
                    [
                         { text: "Enable Self Delete  ✅️", callback_data: 'yesEnable' },
                         { text: "Disable Self Delete  ❌️", callback_data: 'cancelEnable' }
                    ]
                ]
            }
        });
        return
    }
});

bot.action('yesEnable', async (ctx) => {

    const default_caption = `📌  𝙉𝙊𝙏𝙀:  📌\n\n➥ 𝘍𝘰𝘳𝘸𝘢𝘳𝘥 𝘛𝘩𝘪𝘴 𝘔𝘦𝘴𝘴𝘢𝘨𝘦 𝘛𝘰 𝘠𝘰𝘶𝘳 '𝘚𝘢𝘷𝘦𝘥 𝘔𝘦𝘴𝘴𝘢𝘨𝘦𝘴' 𝘊𝘰𝘭𝘭𝘦𝘤𝘵𝘪𝘰𝘯.\n\n➥ 𝘔𝘦𝘴𝘴𝘢𝘨𝘦 𝘞𝘪𝘭𝘭 𝘉𝘦 𝘈𝘶𝘵𝘰𝘮𝘢𝘵𝘪𝘤𝘢𝘭𝘭𝘺 𝘋𝘦𝘭𝘦𝘵𝘦𝘥 🗑 𝘈𝘧𝘵𝘦𝘳 ${secondsToHms(TIMEOUT_SECONDS)}.`;
    const caption = ctx.callbackQuery.message.caption ? `${ctx.callbackQuery.message.caption}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${default_caption}` : default_caption;

    startCountDown(ctx.callbackQuery.message.message_id);
    
    let inline_keyboard = [
         [{ text: "Click Here To Check Remaining Time ⏰️", callback_data: 'checkTime' }]
    ];
    
    if (ctx.callbackQuery.message.video) {
       inline_keyboard.push(
            [
                { text: "📂 Back-Up Channel", url: 'https://t.me/joinchat/ojOOaC4tqkU5MTVl' },
                { text: "✨ Other Channel", url: 'https://t.me/my_channels_list_official' },
            ],
            [{ text: "📣 Current & Back Up Channels Collector", url: 'https://t.me/current_and_backup_channels_list' }]
        )
     };

    ctx.telegram.editMessageCaption(ctx.chat.id, ctx.callbackQuery.message.message_id, null, caption, {
        caption_entities: ctx.callbackQuery.message.caption_entities,
        reply_markup: {
            inline_keyboard: inline_keyboard
        }
    }).then(() => {
        setTimeout(() => {
            ctx.telegram.deleteMessage(ctx.chat.id, ctx.callbackQuery.message.message_id);
        }, TIMEOUT_MILLISECONDS);
    });
});

bot.action('cancelEnable', (ctx) => {
    ctx.telegram.editMessageCaption(ctx.chat.id, ctx.callbackQuery.message.message_id, null, ctx.callbackQuery.message.caption, {
        caption_entities: ctx.callbackQuery.message.caption_entities
    });
})

bot.action('checkTime', async (ctx) => {
    if (!ctx) return;
    const callback_post = postsStack.find((post) => post.msgID === ctx.callbackQuery.message.message_id);
    await ctx.telegram.answerCbQuery(ctx.callbackQuery.id, `${callback_post.counter || 'Counting...'}`, true);
});

/*
Multi-purpose-pdisk
*/

bot.command('switch_pdisk', (ctx) => {
    if (current_pdisk_account === 'online_contents') current_pdisk_account = 'online_content';
    else current_pdisk_account = 'online_contents';
});

bot.command('current_pdisk', (ctx) => {
    const id = current_pdisk_account === 'online_contents' ? "79542932" : "42211234"
    ctx.reply(`You are currently using this pdisk account \n\n➥ user-name: ${current_pdisk_account}\n➥ user-id: ${id}`);
});

bot.command('set_counter', (ctx) => {
    const newCounter = ctx.message.text.split(' ')[1];
    customCounter = Number(newCounter);
    ctx.reply('Custom Page Count has been set.')
});

let oldQuery = '';

bot.on('inline_query', (ctx) => {
    if (ctx.inlineQuery.query.length > 0) {
        if (oldQuery == ctx.inlineQuery.query) {
            pageCounter += 1;
        } else {
            pageCounter = 0;
        }
        if (pageCounter == 0) {
            pageCounter = !!customCounter ? customCounter : 1;
            oldQuery = ctx.inlineQuery.query;
        }
        const url = `https://www.pdisk.net/api/video/search-all-video?searchType=title&searchVal=${ctx.inlineQuery.query}&page=${pageCounter}&pageSize=49`;

        console.log('page', pageCounter)
        console.log('url', url)
        try {
            axios.get(url)
                .then((res) => {
                    if (!res.data.isSuccess) {
                        const results = [{
                            type: 'article',
                            id: 1,
                            title: "Error : 1",
                            input_message_content: {
                                message_text: res.data.msg
                            },
                            description: res.data.msg
                        }];
                        return ctx.answerInlineQuery(results);
                    };
                
                    if (res.data.data.list.length == 0) {
                        const results = [{
                            type: 'article',
                            id: 1,
                            title: `Total Results : ${res.data.data.list.length}`,
                            input_message_content: {
                                message_text: "No Results Found !!"
                            },
                            description: "Please Try Again...."
                        }];
                        return ctx.answerInlineQuery(results);
                    }

                    const searchRes = res.data.data.list;

                    const results = searchRes.map((res, index) => {
                        return {
                            type: 'photo',
                            id: index,
                            photo_url: res.cover || 'https://thumbs.dreamstime.com/b/upset-magnifying-glass-cute-not-found-symbol-unsuccessful-s-upset-magnifying-glass-cute-not-found-symbol-unsuccessful-122205900.jpg',
                            thumb_url: res.cover || 'https://thumbs.dreamstime.com/b/upset-magnifying-glass-cute-not-found-symbol-unsuccessful-s-upset-magnifying-glass-cute-not-found-symbol-unsuccessful-122205900.jpg',
                            caption: `https://pdisk.net/share-video?videoid=${res.item_id}\n\npage: ${pageCounter}`,
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: "Search New Files", switch_inline_query_current_chat: `` }],
                                    [{ text: "Search Again..", switch_inline_query_current_chat: `${oldQuery}` }]
                                ]
                            }
                        }
                    });

                    const offset = res.data.data.list.length > 30 ? 30 * pageCounter : 0;

                    ctx.answerInlineQuery(results, {
                        cache_time: 800,
                        next_offset: offset
                    });
                })
        } catch (error) {
            console.log('axios-error==>', error)
        }
    }
});

bot.command('reset_counter', (ctx) => {
    customCounter = 0;
    ctx.reply('Custom counter succesfully reset !!')
});

bot.action('check_status', async (ctx) => {
    const getId = last_item_id.find(o1 => o1.msgID === ctx.callbackQuery.message.message_id - 1).id;
    if (!getId) return;

    axios.get(`https://www.pdisk.net/api/ndisk-api/content/progress?items=${getId}`).then((newRes) => {
        console.log('res', newRes.data.data);
        const status = newRes.data.data[0].status || 'downloading';
        const progress_rate = Number(newRes.data.data[0].progress_rate || 0) / 100 + '%';
        const time_left = Number(newRes.data.data[0].remaining_time) <= 0 ? '0 second' : secondsToHms(newRes.data.data[0].remaining_time || 0);

        if (status == 'downloading' && progress_rate == 0 + '%' && time_left == '0 second') {
            const url = `https://www.pdisk.net/api/video/search-my-video?dir_id=0&item_id=${getId}&title=&pageSize=10&pageNo=1&desc=&status=&sortField=ctime&sortAsc=0&needDirName=true`;
            axios.get(url).then((res) => {
                ctx.telegram.answerCbQuery(ctx.callbackQuery.id, `Status: ${res.data.data.list[0].status}`, true);
            });
        } else {
            const cbMessage = `Status: ${status}\nProgress: ${progress_rate}\nTime Left: ${time_left}`;
            ctx.telegram.answerCbQuery(ctx.callbackQuery.id, cbMessage, true);
        }
    })
});

bot.command('replace_image', (ctx) => {
    const newImageUrl = ctx.message.text.split(' ')[1] || 'https://1000logos.net/wp-content/uploads/2017/07/Brazzers-symbol.jpg';
    ctx.deleteMessage();
    ctx.deleteMessage(ctx.message.reply_to_message.message_id);
    ctx.telegram.sendPhoto(ctx.chat.id, newImageUrl, {
        caption: ctx.message.reply_to_message.caption,
        caption_entities: ctx.message.reply_to_message.caption_entities
    });
});

bot.command('photo_to_animation', (ctx) => {
    const fileUrl = ctx.message.text.split(' ')[1] || 'https://telegra.ph/file/b23b9e5ed1107e8cfae09.mp4';
    if (!fileUrl) return;

    const repliedCaption = ctx.message.reply_to_message.caption
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const allURLs = repliedCaption.match(urlRegex);

    const notAvailable = "not\\_available";

    const URL_CAPTION = `🔞️ *Screenshots/Preview/Trailer*\n ➪ ${ notAvailable }\n\n🎬 *Video Link*\n ➪ ${ allURLs[0] || notAvailable }\n\n\n`;
    const BACKUP_CAPTION = `💠 _Backup Channel_ :\n ➤ https://t.me/joinchat/ojOOaC4tqkU5MTVl \n\n♻️ _Other Channels_ :\n ➤ https://t.me/my\\_channels\\_list\\_official`;
    const final_caption = DEF_CAPTION + URL_CAPTION + BACKUP_CAPTION;

//     ctx.deleteMessage();

    ctx.telegram.sendAnimation(ctx.chat.id, fileUrl,
        {
            caption: final_caption,
            parse_mode: 'markdown'
        }
    );
});

bot.command('add_screenshot_link', (ctx) => {
    const fileUrl = 'https://telegra.ph/file/b23b9e5ed1107e8cfae09.mp4';
    const screenshotLink = ctx.message.text.split(' ')[1];
    if (!screenshotLink) return;

    const repliedCaption = ctx.message.reply_to_message.caption
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const allURLs = repliedCaption.match(urlRegex);

    const notAvailable = "not\\_available";

    const URL_CAPTION = `🔞️ *Screenshots/Preview/Trailer*\n ➪ ${ screenshotLink }\n\n🎬 *Video Link*\n ➪ ${ allURLs[0] || notAvailable }\n\n\n`;
    const BACKUP_CAPTION = `💠 _Backup Channel_ :\n ➤ https://t.me/joinchat/ojOOaC4tqkU5MTVl \n\n♻️ _Other Channels_ :\n ➤ https://t.me/my\\_channels\\_list\\_official`;
    const final_caption = DEF_CAPTION + URL_CAPTION + BACKUP_CAPTION;

    ctx.telegram.sendAnimation(ctx.chat.id, fileUrl,
        {
            caption: final_caption,
            parse_mode: 'markdown'
        }
    );
});

bot.command('animation_to_photo', (ctx) => {
    const fileUrl = ctx.message.text.split(' ')[1] || 'https://1000logos.net/wp-content/uploads/2017/07/Brazzers-symbol.jpg';
    if (!fileUrl) return;

    ctx.telegram.sendPhoto(ctx.chat.id, fileUrl,
        {
            caption: ctx.message.reply_to_message.caption,
            caption_entities: ctx.message.reply_to_message.caption_entities
        }
    );
});

bot.command('get_photo_id', (ctx) => {
    const photo_id = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1].file_id;
    if (!photo_id) return;
    ctx.reply(photo_id);
});

bot.command('get_video_id', async(ctx) => {
    const videoId = ctx.message.reply_to_message.video.file_id;
    if (!videoId) return;
    ctx.reply(videoId);
});

bot.command('mypdisk', async (ctx) => {
    let repliedMsg = ctx.message.text.split(' ')[1] || ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const compareTo = ['kuklink', 'cofilink', 'pdisk', 'pdisk1', 'kofilink', 'pdisklink', 'vdshort', 'pdisks', 'wslinker', 'cdinks'];
    const allURLs = repliedMsg.match(urlRegex);

    if (allURLs && allURLs.length > 0) repliedMsg = allURLs.find(url => compareTo.some(str => url.includes(str)));
    
    if(!repliedMsg) repliedMsg = ctx.message.text.split(' ')[1] || ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';

    if (!repliedMsg) return ctx.reply('Reply to correct message.');

    const new_url = await getPdiskLink(repliedMsg);
    if (new_url.error) return ctx.reply(new_url.error);
    console.log('new_url', new_url);
    last_item_id.push({ msgID: ctx.message.message_id, id: new_url.item_id });

    let timeout = 0;
    
    if (ctx.chat.id == '-1001518585169') timeout = 1000;
    
    if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) timeout = 1000;

    setTimeout(async () => {
        let backup_image_url = await getDetailsFromId(new_url.item_id)

        console.log('back-called', backup_image_url)

        let URL_CAPTION = `🎬 *Video Link*\n ➪ ${new_url ? new_url.newURL : '...URL Here...'}\n\n\n`;
        if (ctx.chat.id == '-1001518585169') {
            URL_CAPTION = '🔞️ *Screenshots/Preview/Trailer*\n ➪ Replace\\_Link\n\n' + URL_CAPTION;
        };
        const BACKUP_CAPTION = `💠 _Backup Channel_ :\n ➤ https://t.me/joinchat/ojOOaC4tqkU5MTVl \n\n♻️ _Other Channels_ :\n ➤ https://t.me/my\\_channels\\_list\\_official`;
        let final_caption = DEF_CAPTION + URL_CAPTION + BACKUP_CAPTION;

        let msgID;

        if (!backup_image_url || backup_image_url == 'error') {
            backup_image_url = 'https://1000logos.net/wp-content/uploads/2017/07/Brazzers-symbol.jpg'
        }

        if (ctx.chat.id == '-1001518585169') {
            msgID = 'https://telegra.ph/file/b23b9e5ed1107e8cfae09.mp4';
        }
        else if (checkMsgType(ctx) == 'sendPhoto') {
            if (ctx.message.reply_to_message) {
                msgID = ctx.message.reply_to_message.photo ? ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1].file_id : backup_image_url;
            } else {
                msgID = backup_image_url;
            }
        }
        else if (checkMsgType(ctx) == 'sendDocument') {
            msgID = ctx.message.reply_to_message.document.file_id;
        }
        else if (checkMsgType(ctx) == 'sendAnimation') {
            msgID = 'https://telegra.ph/file/b23b9e5ed1107e8cfae09.mp4' || ctx.message.reply_to_message.animation.file_id;
        }

        if (!msgID) return;

        ctx.telegram[checkMsgType(ctx)](ctx.chat.id, msgID,
            {
                caption: final_caption,
                parse_mode: 'markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "Check Status  🔍️", callback_data: 'check_status' }
                        ]
                    ]
                }
            }
        );
//         ctx.deleteMessage();
    }, timeout)
});

bot.command('create_telegraph', (ctx) => {
    const formattedContent = getTelegraphFormattedContent(ctx.message.text);
    if (!formattedContent) ctx.reply('Something wrong with values !!');

    telegraphClient.createPage('Preview', formattedContent, 'Rohit Sharma', 'https://t.me/my_channels_list_official', true)
    .then((res) => {
        ctx.reply(`${res.url || 'Something Went Wrong !!'}`);
    })
    .catch((error) => {
        ctx.reply(error);
    });

});

bot.command('edit_telegraph', (ctx) => {
    const formattedContent = getTelegraphFormattedContent(ctx.message.text);
    if (!formattedContent) ctx.reply('Something wrong with values !!');

    telegraphClient.editPage(formattedContent.path,'Preview', formattedContent.content, 'Rohit Sharma', 'https://t.me/my_channels_list_official', true)
    .then((res) => {
        ctx.reply(`${res.url || 'Something Went Wrong !!'}`);
    })
    .catch((error) => {
        ctx.reply(error);
    });
});

async function downloadImage(url, path) {
    const writer = fs.createWriteStream(path)

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    })

    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve)
        writer.on('error', reject)
    })
};

bot.command('test2', async (ctx) => {
    const link = ctx.message.text.split(' ')[1];
    try {
        ffmpeg.ffprobe(link, function(err, metadata) {
            console.log('metadata=======', metadata);
            console.log('error=====', err)
        });
    } catch (error) {
        console.log('catch-errror=====', error)
    }
});

bot.command('test', async (ctx) => {
    console.log('test-command-568');
    if(!fs.existsSync('uploads')) {
        fs.mkdirSync('uploads');
    };
    console.log('572');
    const localFilePath = "./uploads/Hello.mp4"
    let myScreenshots = [];
    console.log('file-is-going-to-be-saved', localFilePath);
    await downloadImage('https://www.learningcontainer.com/wp-content/uploads/2020/05/sample-mp4-file.mp4', localFilePath);
    console.log('file-is-saved');
    
    if(!fs.existsSync('./uploads/Hello.mp4')) console.log('not-existed');
    
    try {
        console.log('gone-in-try');
        ffmpeg('./uploads/Hello.mp4')
        .on('filenames', function(filenames) {
            console.log('filenames', filenames);
            myScreenshots = filenames
         })
        .on('end', function() {
            console.log('Screenshots taken');
            myScreenshots.forEach(ss => {
                console.log('ss', ss)
                ctx.replyWithPhoto({ source : path.join(__dirname + `/downloads/${ss}`)});
            });
         })
        .on('error', function(err) {
            console.error(err);
         })
        .screenshots({
            // Will take screenshots at 20%, 40%, 60%, 80% and 100% of the video
            count: 5,
            folder: './downloads/'
        });
    }
    catch (error){
        console.log('try-catch-error',error)
    }  
});

bot.command('show_cookies', (ctx) => {
    ctx.reply(`Here is your cookies:\n\n\`${get_cookies()}\``, {
        parse_mode: 'markdown',
    });
});

bot.command('show_xsrf', (ctx) => {
    ctx.reply(`Here is your xsrf token:\n\n\`${get_xsrf()}\``, {
        parse_mode: 'markdown',
    });
});

bot.command('login_online_content', async (ctx) => {
    const response = await set_cookie('online_content'.toUpperCase());
    ctx.reply(response, {
        parse_mode: 'markdown',
    });
});

bot.command('login_online_contents', async (ctx) => {
    const response = await set_cookie('online_contents'.toUpperCase());
    ctx.reply(response, {
        parse_mode: 'markdown',
    });
});

bot.launch();
