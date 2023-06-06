/* eslint-disable */

/**
 * 此项目配置为方便新人使用，已缩减至最简配置。
 * 如若想使用更多功能，请查考文档中的 【3. config参数说明】 
 * 自行添加属性，以支持更多个性化功能
 */
const USER_CONFIG = {

  USE_PASSAGE: 'wechat-test',
  // 使用微信测试号：公众号APP_ID
  APP_ID: "wx152928458226316c",

  // 使用微信测试号：公众号APP_SECRET
  APP_SECRET: "46a00a9082dc452b68425715c2e065e9",
  // 默认所在省份, USERS 中没填的话, 会默认拿这里的省份
  PROVINCE: '四川',
  // 默认所在城市, USERS 中没填的话, 会默认拿这里的城市
  CITY: '成都',
  MAX_PUSH_ONE_MINUTE: 5,
  SLEEP_TIME: 65000,
  IS_SHOW_COLOR: true,
   /** 每日一言 */
  // 每日一言的内容类型
  // 可以填写【动画，漫画，游戏，小说，原创，网络，其他】； 随机则填写 ""
  LITERARY_PREFERENCE: '',
  
  SWITCH: {
    /** 每日天气 */
    // 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    weather: true,

    /** 节假日 */
    // 下一休息日综合提醒, 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    holidaytts: true,

    /** 每日N句 */
    // 金山每日一句, 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    CIBA: true,
    
    // 每日一言, 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    oneTalk: true,
    
    // 土味情话(彩虹屁), 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    earthyLoveWords: true,
    
    // 朋友圈文案, 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    momentCopyrighting: true,
    
    // 毒鸡汤, 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    poisonChickenSoup: false,
    
    // 古诗古文, 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    poetry: false,

    /** 星座运势 */
    // 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    horoscope: false,
  
    /** 生日消息和节日消息 */
    // 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    birthdayMessage: true,
  
    /** 学生课表 */
    // 填 false 则不使用，按需关闭不使用的功能可以提高运行速度
    courseSchedule: false,
  },
  
    USERS: [
    /**{
      // 想要发送的人的名字
      name: "老婆0",
      // 扫码关注你的微信测试号后生成的一段字符串，在测试号后台能看到
      id: "",
      // 你想对他发送的模板消息的模板ID
      useTemplateId: "",
      // 所在省份
      province: "广东",
      // 所在城市
      city: "肇庆",
      // 新历生日, 仅用作获取星座运势, 格式必须
      horoscopeDate: '12-27',
      // 获取什么时候的星座运势，可选：['今日', '明日', '本周', '本月', '今年'], 留空则随机
      horoscopeDateType: '今日',
      // 他点击详情后跳转的页面,你可以设置成微博的热榜，也可以设置成其他，网址一定要填对；不填对也没关系，随便你，会打不开而已。
      openUrl: "https://wangxinleo.cn",
      // 专属节日提醒，如果你在这里填写了节日提醒，就不会执行FESTIVALS的提醒了, 和FESTIVALS的配置方法相同，可以往下查看，我这里就不重复写了
      festivals: [
        // 注意：此条配置日期为阴历日期，因为`type`中 “生日” 之前有 * 符号
        {"type": "*生日", "name": "老婆", "year": "1996", "date": "09-09"},
        {"type": "节日", "name": "结婚纪念日", "year": "2020", "date": "09-03"},
        // 注意：此条配置日期为阳历日期，因为`type`中 “生日” 之前没有 * 符号
        {"type": "生日", "name": "李四", "year": "1996", "date": "09-31"},
        {"type": "节日", "name": "被搭讪纪念日", "year": "2021", "date": "09-01"},
      ],
      // 专属纪念日/倒数日，如果你在这里填写了纪念日/倒数日，就不会计算CUSTOMIZED_DATE_LIST的日子了, 和CUSTOMIZED_DATE_LIST的配置方法相同，可以往下查看，我这里就不重复写了
      customizedDateList: [
        // 在一起的日子
        {"keyword": "love_day", date: "2022-09-08"},
        // 结婚纪念日
        {"keyword": "marry_day", date: "2022-09-09"},
        // 退伍日
        {"keyword": "ex_day", date: "2022-09-10"},
      ]
    },
    **/
    {
      name: "宝贝1",
      id: "oMS0U5xbICm79oMq6LOBaTCMDams",
      //useTemplateId: "z8r4iLgmjEXbfy2a3zUl6FlTK3It_6HHJr03_oasYUQ",
      useTemplateId:"KWZt7ZCDkxNZhhEesQdPBDYbwFxgFtdg8197aHjFCjQ",
      province: "四川",
      city: "洪雅",
      horoscopeDate: '11-15',
      horoscopeDateType: '今日',
      openUrl: "https://www.toutiao.com/?wid=1683253431525",
      festivals: [
       {"type": "*生日", "name": "宝贝", "year": "1998", "date": "11-15", isShowAge: true},
   {"type": "*节日", "name": "过年啦", "date": "01-01"},
   {"type": "节日", "name": "恋爱纪念日", "date": "03-24"},
   {"type": "节日", "name": "国庆节", "date": "10-01"},
   {"type": "节日", "name": "元旦节", "date": "01-01"},
   {"type": "*节日", "name": "端午节", "date": "05-05"},
     ],
      customizedDateList: [
      {"keyword": "love_day", date: "2021-03-24"},
      ]
    },
     {
      name: "cxl",
      id: "oMS0U5wO3Vxcwf3ZX4_yWlUz48oE",
      useTemplateId:"_2Pa55VvWWlGMymHpviIKvga9C2-ql0SlsVr22JGvmI",
      province: "四川",
      city: "成都",
      horoscopeDate: '12-25',
      horoscopeDateType: '今日',
      openUrl: "https://wangxinleo.cn",
      festivals: [
       {"type": "*生日", "name": "宝贝", "year": "1998", "date": "11-15", isShowAge: true},
   {"type": "*节日", "name": "过年啦", "date": "01-01"},
   {"type": "节日", "name": "恋爱纪念日", "date": "03-24"},
   {"type": "节日", "name": "国庆节", "date": "10-01"},
   {"type": "节日", "name": "元旦节", "date": "01-01"},
        {"type": "*节日", "name": "端午节", "date": "05-05"},
     ],
      customizedDateList: [
      {"keyword": "love_day", date: "2021-03-24"},
      ]
    },
      {
      name: "宝贝2",
      id: "oMS0U58g6PovLsUwnuJ-zUziyl3k",
      useTemplateId: "z8r4iLgmjEXbfy2a3zUl6FlTK3It_6HHJr03_oasYUQ",
      province: "四川",
      city: "广安",
      horoscopeDate: '11-15',
      horoscopeDateType: '今日',
      openUrl: "https://www.toutiao.com/?wid=1683253431525",
      festivals: [
       {"type": "*生日", "name": "宝贝", "year": "1998", "date": "11-15", isShowAge: true},
   {"type": "*节日", "name": "过年啦", "date": "01-01"},
   {"type": "节日", "name": "恋爱纪念日", "date": "03-24"},
   {"type": "节日", "name": "国庆节", "date": "10-01"},
   {"type": "节日", "name": "元旦节", "date": "01-01"},
        {"type": "*节日", "name": "端午节", "date": "05-05"},
     ],
      customizedDateList: [
      {"keyword": "love_day", date: "2021-03-24"},
      ]
    },
    // 你可以不断按格式往下增加
    // ...
  ],


  // 【推送完成提醒】模板id, 用来看自己有没有发送成功的那个模板
  CALLBACK_TEMPLATE_ID: '',

  CALLBACK_USERS: [
    {
      name: '自己',
      // 使用微信测试号：自己的微信id，扫码关注你的微信测试号后生成的一段字符串，在测试号后台能看到
      id: '',
    }
  ],

}

module.exports = USER_CONFIG

