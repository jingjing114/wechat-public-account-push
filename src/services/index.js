import axios from 'axios'
import dayjs from 'dayjs'
import { JSDOM } from 'jsdom'
import cloneDeep from 'lodash/cloneDeep.js'
import config from '../../config/exp-config.js'
import TEMPLATE_CONFIG from '../../config/template-config.cjs'
import { DEFAULT_OUTPUT, TYPE_LIST, RUN_TIME_STORAGE } from '../store/index.js'
import {
  getConstellation,
  randomNum,
  sortBirthdayTime,
  getColor,
  toLowerLine,
  getWeatherCityInfo,
  sleep,
} from '../utils/index.js'
import { selfDayjs, timeZone } from '../utils/set-def-dayjs.js'

axios.defaults.timeout = 10000

// 使用单空行还是双空行
const getLB = () => {
  if (!config.USE_PASSAGE || config.USE_PASSAGE === 'wechat-test') {
    return '\n'
  }
  return '\n\n'
}

/**
 * 获取 accessToken
 * @returns accessToken
 */
export const getAccessToken = async () => {
  // APP_ID
  const appId = config.APP_ID || process.env.APP_ID
  // APP_SECRET
  const appSecret = config.APP_SECRET || process.env.APP_SECRET
  // accessToken
  let accessToken = null

  // 打印日志
  if (!appId) {
    console.log('未填写appId!! 请检查是否actions secret的变量拼写正确，仔细阅读文档!!', appId)
    return null
  }
  if (!appSecret) {
    console.log('未填写appSecret!! 请检查是否actions secret的变量拼写正确，请仔细阅读文档!!', appId)
    return null
  }

  console.log('已获取appId', appId)
  console.log('已获取appSecret', appSecret)

  const postUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`

  try {
    const res = await axios.get(postUrl).catch((err) => err)
    if (res.status === 200 && res.data && res.data.access_token) {
      accessToken = res.data.access_token
      console.log('---')
      console.log('获取 accessToken: 成功', res.data)
      console.log('---')
    } else {
      console.log('---')
      console.error('获取 accessToken: 请求失败', res.data.errmsg || res.data)
      console.log('---')
      console.log(`40001: 请检查appId，appSecret 填写是否正确；
                  如果第一次使用微信测试号请关闭测试号平台后重新扫码登陆测试号平台获取最新的appId，appSecret`)
    }
  } catch (e) {
    console.error('获取 accessToken: ', e)
  }

  return accessToken
}

/**
 * 获取天气icon
 * @param {*} weather
 * @returns
 */
export const getWeatherIcon = (weather) => {
  let weatherIcon = '🌈'
  const weatherIconList = ['☀️', '☁️', '⛅️',
    '☃️', '⛈️', '🏜️', '🏜️', '🌫️', '🌫️', '🌪️', '🌧️']
  const weatherType = ['晴', '阴', '云', '雪', '雷', '沙', '尘', '雾', '霾', '风', '雨']

  weatherType.forEach((item, index) => {
    if (weather.indexOf(item) !== -1) {
      weatherIcon = weatherIconList[index]
    }
  })

  return weatherIcon
}

/**
 * 获取天气情况
 * @param {*} province 省份
 * @param {*} city 城市
 * @param {*} county 地区
 */
export const getWeather = async (province, city) => {
  if (config.SWITCH && config.SWITCH.weather === false) {
    return {}
  }

  // 读取缓存
  if (RUN_TIME_STORAGE[`${province}_${city}`]) {
    console.log(`获取了相同的数据，读取缓存 >>> ${province}_${city}`)
    return RUN_TIME_STORAGE[`${province}_${city}`]
  }

  /*const cityInfo = getWeatherCityInfo(province, city)
  if (!cityInfo) {
    console.error('配置文件中找不到相应的省份或城市')
    return {}
  }*/
  //const url = `http://t.weather.itboy.net/api/weather/city/${cityInfo.city_code}`
  const province1 = encodeURIComponent(province);
  const city1 = encodeURIComponent(city);

  // 请求实时观测数据（天气状况、风向风力等）
  const observeUrl = `https://wis.qq.com/weather/common?source=pc&weather_type=observe&province=${province1}&city=${city1}`
  // 请求预报数据（包含最高/最低气温）
  const forecastUrl = `https://wis.qq.com/weather/common?source=pc&weather_type=forecast_24h&province=${province1}&city=${city1}`

  const [observeRes, forecastRes] = await Promise.all([
    axios.get(observeUrl, { headers: { 'Content-Type': 'application/json' } }).catch((err) => err),
    axios.get(forecastUrl, { headers: { 'Content-Type': 'application/json' } }).catch((err) => err),
  ])

  if (observeRes.status === 200 && observeRes.data && observeRes.data.status === 200) {
    const observeInfo = observeRes.data.data.observe
    // 从预报数据中获取今日最高/最低温度
    let forecastInfo = null
    if (forecastRes.status === 200 && forecastRes.data && forecastRes.data.status === 200) {
      forecastInfo = forecastRes.data.data.forecast_24h && forecastRes.data.data.forecast_24h[0]
    }
    console.log('实时天气:', observeInfo)
    console.log('今日预报:', forecastInfo)
    if (!observeInfo) {
      console.error('天气情况: 找不到天气信息, 获取失败')
      return {}
    }
    const result = {
      //湿度
      shidu: observeInfo.humidity,
      //天气
      weather: observeInfo.weather,
      //风向
      windDirection: observeInfo.wind_direction_name,
      //风级
      windScale: observeInfo.wind_power,
      //最高温度（从预报数据取，如果没有则回退到当前温度）
      maxTemperature: (forecastInfo && forecastInfo.max_degree) || observeInfo.degree,
      //最低温度（从预报数据取，如果没有则回退到当前温度）
      minTemperature: (forecastInfo && forecastInfo.min_degree) || observeInfo.degree,
    }
   /*const result = {
      // 湿度
      shidu: commonInfo.shidu,
      // PM2.5
      pm25: commonInfo.pm25,
      // PM1.0
      pm10: commonInfo.pm10,
      // 空气质量
      quality: commonInfo.quality,
      // 预防感冒提醒
      ganmao: commonInfo.ganmao,
      // 日出时间
      sunrise: info.sunrise,
      // 日落时间
      sunset: info.sunset,
      // 空气质量指数
      aqi: info.aqi,
      // 天气情况
      weather: info.type,
      // 最高温度*/
      //maxTemperature: info.high.replace(/^高温\s, ''),
      // 最低温度,删除了斜杠*
      //minTemperature: info.low.replace(/^低温\s, ''),
      /*
      // 风向
      windDirection: info.fx,
      // 风力等级
      windScale: info.fl,
      // 温馨提示
      notice: info.notice,
    }*/

    RUN_TIME_STORAGE[`${province}_${city}`] = cloneDeep(result)

    return result
  }
  console.error('天气情况获取失败', res)
  return {}
}

/**
 * 金山词霸每日一句
 * @returns
 */
export const getCIBA = async () => {
  const url = 'http://open.iciba.com/dsapi/'
  const res = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    },
  }).catch((err) => err)

  if (res.status === 200 && res) {
    const data = res.data
    const keys = [{
      from: 'content',
      to: 'note_en'
    }, {
      from: 'note',
      to: 'note_ch'
    }]
    keys.forEach(obj => {
      const value = data[obj.from]
      const arr = []
      for (let j = 0, i = 0; j < value.length; j += 20) {
        arr.push({
          name: `wx_${obj.to}_${i}`,
          value: value.slice(j, j + 20),
          color: getColor()
        })
        i++
      }
      data[`wx_${obj.to}`] = arr
    }) 

    return {
      noteEn: data['content'],
      wxNoteEn: data['wx_note_en'],
      noteCh: data['note'],
      wxNoteCh: data['wx_note_ch'],
    }
  }
  console.error('金山词霸每日一句: 发生错误', res)
  return {}
}

/**
 * 获取下一休息日tts
 * @returns
 */
export const getHolidaytts = async () => {
  if (config.SWITCH && config.SWITCH.holidaytts === false) {
    return null
  }

  const year = new Date().getFullYear()
  let data = DEFAULT_OUTPUT.holidaytts

  // 方式一：timor.tech API（优先使用，数据最全）
  try {
    const timorUrl = `https://timor.tech/api/holiday/year/${year}`
    const res = await axios.get(timorUrl, { timeout: 8000 }).catch((err) => err)
    if (res.status === 200 && res.data && res.data.code === 0) {
      const holidays = res.data.holiday
      const today = dayjs().format('YYYY-MM-DD')
      let nextHoliday = null
      let minDiff = Infinity

      Object.keys(holidays).forEach((key) => {
        const holiday = holidays[key]
        // 只取真正的节假日首日（holiday === true 且 name 不含"补班"）
        if (holiday.holiday === true && !holiday.name.includes('补班') && !holiday.name.includes('除夕')) {
          const diff = dayjs(holiday.date).diff(dayjs(today), 'day')
          if (diff >= 0 && diff < minDiff) {
            minDiff = diff
            nextHoliday = holiday
          }
        }
      })

      if (nextHoliday) {
        console.log('节假日API(天行): 找到下个休息日', nextHoliday)
        if (minDiff === 0) {
          data = `今天是 ${nextHoliday.name}！`
        } else {
          data = `距离 ${nextHoliday.name} 还有 ${minDiff} 天`
        }
        // 成功获取，跳过备用API
        return formatHolidayResult(data)
      }
    }
    console.error('timor.tech 未返回有效节假日数据，尝试备用 API...', res.data || res)
  } catch (e) {
    console.error('timor.tech 请求失败，尝试备用 API...', e.message)
  }

  // 方式二：Nager.Date API（备用）
  try {
    const nagerUrl = `https://date.nager.at/api/v3/publicholidays/${year}/CN`
    const nagerRes = await axios.get(nagerUrl, { timeout: 8000 }).catch((err) => err)
    if (nagerRes.status === 200 && Array.isArray(nagerRes.data) && nagerRes.data.length > 0) {
      const today = dayjs()
      const holidays = nagerRes.data
      let nextHoliday = null
      let minDiff = Infinity

      holidays.forEach((holiday) => {
        const diff = dayjs(holiday.date).diff(today, 'day')
        if (diff >= 0 && diff < minDiff) {
          minDiff = diff
          nextHoliday = holiday
        }
      })

      if (nextHoliday) {
        console.log('节假日API(Nager): 找到下个休息日', nextHoliday)
        if (minDiff === 0) {
          data = `今天是 ${nextHoliday.localName}！`
        } else {
          data = `距离 ${nextHoliday.localName} 还有 ${minDiff} 天`
        }
      }
    } else {
      console.error('Nager.Date 未返回有效数据', nagerRes.data || nagerRes)
    }
  } catch (e) {
    console.error('Nager.Date 请求失败', e.message)
  }

  return formatHolidayResult(data)
}

/**
 * 格式化节假日返回结果
 */
function formatHolidayResult(data) {
  const arr = []
  for (let j = 0, i = 0; j < data.length; j += 20) {
    arr.push({
      name: `wx_holidaytts_${i}`,
      value: data.slice(j, j + 20),
      color: getColor()
    })
    i++
  }

  return {
    holidaytts: data,
    wxHolidaytts: arr
  }
}

/**
 * 每日一言
 * @param {*} type
 * @returns
 */
export const getOneTalk = async (type) => {
  if (config.SWITCH && config.SWITCH.oneTalk === false) {
    return {}
  }

  const filterQuery = TYPE_LIST.filter((item) => item.name === type)
  const query = filterQuery.length ? filterQuery[0].type : TYPE_LIST[randomNum(0, 7)].type
  const url = `https://v1.hitokoto.cn/?c=${query}`

  const res = await axios.get(url).catch((err) => err)

  if (res && res.status === 200) {
    const data = res.data
    const keys = [{
      from: 'hitokoto',
      to: 'one_talk'
    }]
    keys.forEach(obj => {
      const value = data[obj.from]
      const arr = []
      for (let j = 0, i = 0; j < value.length; j += 20) {
        arr.push({
          name: `wx_${obj.to}_${i}`,
          value: value.slice(j, j + 20),
          color: getColor()
        })
        i++
      }
      data[`wx_${obj.to}`] = arr
    }) 
    return data
  }

  console.error('每日一言: 发生错误', res)
  return {}
}

/**
 * 从沙雕APP开放接口中获取数据
 * @param {'chp' | 'pyq' | 'du'} type
 * @returns {Promise<String>}
 */
export const getWordsFromApiShadiao = async (type) => {
  const typeNameMap = {
    chp: '土味情话(彩虹屁)',
    pyq: '朋友圈文案',
    du: '毒鸡汤',
  }
  if (!['chp', 'pyq', 'du'].includes(type)) {
    console.error('type参数有误，应为chp, pyq, du的其中一个')
    return ''
  }
  const url = `https://api.shadiao.pro/${type}`
  try {
    const res = await axios.get(url, {
      responseType: 'json',
    }).catch((err) => err)
    return (res.data && res.data.data && res.data.data.text) || ''
  } catch (e) {
    console.error(`${typeNameMap[type]}：发生错误`, e)
    return ''
  }
}

/**
 * 土味情话（彩虹屁）
 * @returns {Promise<String>} 土味情话(彩虹屁）内容
 */
export const getEarthyLoveWords = async () => {
  if (config.SWITCH && config.SWITCH.earthyLoveWords === false) {
    return ''
  }

  const data = await getWordsFromApiShadiao('chp') || DEFAULT_OUTPUT.earthyLoveWords

  const arr = []
  for (let j = 0, i = 0; j < data.length; j += 20) {
    arr.push({
      name: `wx_earthy_love_words_${i}`,
      value: data.slice(j, j + 20),
      color: getColor()
    })
    i++
  }

  return {
    earthyLoveWords: data,
    wxEarthyLoveWords: arr
  }
}

/**
 * 朋友圈文案
 * @returns {Promise<String>} 朋友圈文案内容
 */
export const getMomentCopyrighting = async () => {
  if (config.SWITCH && config.SWITCH.momentCopyrighting === false) {
    return ''
  }
  const data = await getWordsFromApiShadiao('pyq') || DEFAULT_OUTPUT.momentCopyrighting

  const arr = []
  for (let j = 0, i = 0; j < data.length; j += 20) {
    arr.push({
      name: `wx_moment_copyrighting_${i}`,
      value: data.slice(j, j + 20),
      color: getColor()
    })
    i++
  }

  return {
    momentCopyrighting: data,
    wxMomentCopyrighting: arr
  }
}

/**
 * 毒鸡汤
 * @returns {Promise<String>} 毒鸡汤内容
 */
export const getPoisonChickenSoup = async () => {
  if (config.SWITCH && config.SWITCH.poisonChickenSoup === false) {
    return ''
  }

  const data = await getWordsFromApiShadiao('du') || DEFAULT_OUTPUT.poisonChickenSoup

  const arr = []
  for (let j = 0, i = 0; j < data.length; j += 20) {
    arr.push({
      name: `wx_poison_chicken_soup_${i}`,
      value: data.slice(j, j + 20),
      color: getColor()
    })
    i++
  }

  return {
    poisonChickenSoup: data,
    wxPoisonChickenSoup: arr
  }
}

/**
 * 古诗古文
 * @returns {Promise<{}|{dynasty: string, author: string, title: string, content: string}>} 古诗内容 标题 作者 朝代
 */
export const getPoetry = async () => {
  if (config.SWITCH && config.SWITCH.poetry === false) {
    return {}
  }

  const url = 'https://v2.jinrishici.com/sentence'
  try {
    const res = await axios.get(url, {
      headers: {
        'X-User-Token': 'FW8KNlfULPtZ9Ci6aNy8aTfPJPwI+/Ln',
      },
      responseType: 'json',
    }).catch((err) => err)
    const { status, data, warning } = res.data || {}
    if (status !== 'success') {
      console.error('古诗古文：发生错误', warning || '')
      return {}
    }
    const { content = DEFAULT_OUTPUT.poetryContent, origin } = data || {}

    const wxContent = []
    for (let j = 0, i = 0; j < content.length; j += 20) {
      wxContent.push({
        name: `wx_poetry_content_${i}`,
        value: content.slice(j, j + 20),
        color: getColor()
      })
      i++
    }

    const { title = '', author = '', dynasty = '' } = origin || {}
    return {
      content,
      wxContent,
      title,
      author,
      dynasty,
    }
  } catch (e) {
    console.error('古诗古文：发生错误', e)
    return {}
  }
}

/**
 * 星座运势请求
 * @param {string} date
 * @param {string} dateType
 * @returns
 */
export const getConstellationFortune = async (date, dateType) => {
  if (config.SWITCH && config.SWITCH.horoscope === false) {
    return []
  }

  const res = []
  if (!date) {
    return res
  }

  const periods = ['今日', '明日', '本周', '本月', '今年']
  const defaultType = [{
    name: '综合运势',
    key: 'comprehensiveHoroscope',
  }, {
    name: '爱情运势',
    key: 'loveHoroscope',
  }, {
    name: '事业学业',
    key: 'careerHoroscope',
  }, {
    name: '财富运势',
    key: 'wealthHoroscope',
  }, {
    name: '健康运势',
    key: 'healthyHoroscope',
  }]

  // 未填写时段，则取今日
  if (!dateType) {
    dateType = '今日'
  }

  const dateTypeIndex = periods.indexOf(dateType)
  if (dateTypeIndex === -1) {
    console.error('星座日期类型horoscopeDateType错误, 请确认是否按要求填写!')
    return res
  }

  // 获取星座id
  const { en: constellation } = getConstellation(date)

  // 读取缓存
  if (RUN_TIME_STORAGE[`${constellation}_${dateTypeIndex}`]) {
    console.log(`获取了相同的数据，读取缓存 >>> ${constellation}_${dateTypeIndex}`)
    return RUN_TIME_STORAGE[`${constellation}_${dateTypeIndex}`]
  }

  const url = `https://www.xzw.com/fortune/${constellation}/${dateTypeIndex}.html`
  try {
    const { data } = await axios.get(url).catch((err) => err)
    if (data) {
      const jsdom = new JSDOM(data)
      defaultType.forEach((item, index) => {
        let value = jsdom.window.document.querySelector(`.c_cont p strong.p${index + 1}`).nextElementSibling.innerHTML.replace(/<small.*/, '')
        if (!value) {
          value = DEFAULT_OUTPUT.constellationFortune
          console.error(`${item.name}获取失败`)
        }
        res.push({
          name: toLowerLine(item.key),
          value: `${dateType}${item.name}: ${value}`,
          color: getColor(),
        })
      })
    } else {
      // 拿不到数据则拼假数据, 保证运行
      defaultType.forEach((item) => {
        const value = DEFAULT_OUTPUT.constellationFortune
        res.push({
          name: toLowerLine(item.key),
          value: `${dateType}${item.name}: ${value}`,
          color: getColor(),
        })
      })
    }

    RUN_TIME_STORAGE[`${constellation}_${dateTypeIndex}`] = cloneDeep(res)

    return res
  } catch (e) {
    console.error('星座运势：发生错误', e)
    return res
  }
}

/**
 * 获取课程表
 * @param courseSchedule {Array<Array<String>>|{benchmark: {date: string, isOdd: boolean}, courses: {odd: Array<Array<string>>, even:Array<Array<string>>}}}
 * @returns
 */
export const getCourseSchedule = (courseSchedule) => {
  if (config.SWITCH && config.SWITCH.courseSchedule === false) {
    return ''
  }
  if (!courseSchedule) {
    return ''
  }
  const week = (selfDayjs().day() + 6) % 7
  // 如果课程表是一个数组，认为只有单周的课表
  if (Array.isArray(courseSchedule)) {
    return (courseSchedule[week] || []).join(getLB())
  }
  // 如果是一个对象，则根据基准日期判断单双周
  const benchmarkDate = selfDayjs(courseSchedule.benchmark.date)
  const diff = selfDayjs().diff(benchmarkDate.set('day', 0).set('hour', 0).set('minute', 0).set('second', 0)
    .set('millisecond', 0), 'millisecond')
  const isSameKind = Math.floor(diff / 7 / 86400000) % 2 === 0
  const kind = ((isSameKind && courseSchedule.benchmark.isOdd) || (!isSameKind && !courseSchedule.benchmark.isOdd)) ? 'odd' : 'even'
  
  const temp = ((courseSchedule.courses && courseSchedule.courses[kind] && courseSchedule.courses[kind][week]) || [])
  const schedule = temp.join(getLB())
  const wechatTestCourseSchedule = []
  temp.forEach((item, index) => {
    wechatTestCourseSchedule.push({
      name: toLowerLine(`wxCourseSchedule_${index}`),
      value: item,
      color: getColor()
    })
  })

  return {schedule, wechatTestCourseSchedule}
}

/**
 * 获取bing每日壁纸数据
 */
export const getBing = async () => {
  const url = 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1'

  const res = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).catch((err) => err)

  if (res.data && res.data.images) {
    const imgUrl = `https://cn.bing.com/${res.data.images[0].url}`
    const imgTitle = res.data.images[0].title
    const imgContent = res.data.images[0].copyright.replace(/\(.*?\)/, '')
    return {
      imgUrl,
      imgTitle,
      imgContent,
    }
  }
  return {}
}

/**
 * 获取重要节日信息
 * @param {Array<object>} festivals
 * @return
 */
export const getBirthdayMessage = (festivals) => {
  if (config.SWITCH && config.SWITCH.birthdayMessage === false) {
    return ''
  }

  if (Object.prototype.toString.call(festivals) !== '[object Array]'
    || festivals.length === 0) {
    festivals = null
  }

  // 计算重要节日倒数
  const birthdayList = sortBirthdayTime((festivals || config.FESTIVALS || [])).map((it) => {
    if (!it.useLunar) {
      return it
    }
    const date = selfDayjs().add(it.diffDay, 'day')
    return {
      ...it,
      soarYear: date.format('YYYY'),
      solarDate: date.format('MM-DD'),
    }
  })
  let resMessage = ''
  const wechatTestBirthdayMessage = []
  

  birthdayList.forEach((item, index) => {
    if (
      !config.FESTIVALS_LIMIT
      || (config.FESTIVALS_LIMIT && index < config.FESTIVALS_LIMIT)
    ) {
      let message = null

      // 生日相关
      if (item.type === '生日') {
        // 获取周岁
        let age
        if (!item.useLunar) {
          age = selfDayjs().diff(`${item.year}-${item.date}`, 'year')
        } else {
          age = selfDayjs().year() - item.year - 1
        }

        if (item.diffDay === 0) {
          message = `今天是 「${item.name}」 的${age && item.isShowAge ? `${(item.useLunar ? 1 : 0) + age}岁` : ''}${item.useLunar ? '阴历' : '公历'}生日哦，祝${item.name}生日快乐！`
        } else {
          message = `距离 「${item.name}」 的${age && item.isShowAge ? `${age + 1}岁` : ''}${item.useLunar ? '阴历' : '公历'}生日还有${item.diffDay}天`
        }
      }

      // 节日相关
      if (item.type === '节日') {
        if (item.diffDay === 0) {
          message = `今天是 「${item.name}」 哦，要开心！`
        } else {
          message = `距离 「${item.name}」 还有${item.diffDay}天`
        }
      }

      // 存储数据
      if (message) {
        resMessage += `${message} ${getLB()}`
        wechatTestBirthdayMessage.push({
          name: toLowerLine(`wxBirthday_${index}`),
          value: message,
          color: getColor()
        })
      }
    }
  })

  return {resMessage, wechatTestBirthdayMessage}
}

/**
 * 计算每个重要日子的日期差
 * @params {*} customizedDateList
 * @returns
 */
export const getDateDiffList = (customizedDateList) => {
  if (Object.prototype.toString.call(customizedDateList) !== '[object Array]'
    && Object.prototype.toString.call(config.CUSTOMIZED_DATE_LIST) !== '[object Array]') {
    return []
  }
  const dateList = customizedDateList || config.CUSTOMIZED_DATE_LIST

  dateList.forEach((item) => {
    item.diffDay = Math.ceil(selfDayjs().diff(selfDayjs(item.date), 'day', true))
    if (item.diffDay <= 0) {
      item.diffDay = Math.abs(Math.floor(selfDayjs().diff(selfDayjs(item.date), 'day', true)))
    }
  })

  return dateList
}

/**
 * 自定义插槽信息
 * @returns
 */
export const getSlotList = () => {
  if (Object.prototype.toString.call(config.SLOT_LIST) !== '[object Array]') {
    return []
  }
  const slotList = config.SLOT_LIST

  slotList.forEach((item) => {
    if (Object.prototype.toString.call(item.contents) === '[object Array]' && item.contents.length > 0) {
      item.checkout = item.contents[Math.floor(Math.random() * item.contents.length + 1) - 1]
    } else if (Object.prototype.toString.call(item.contents) === '[object String]') {
      item.checkout = item.contents
    } else {
      item.checkout = ''
    }
  })

  return slotList
}

/**
 * 天行统一调用接口
 * @param apiType
 * @param params
 * @returns {Promise<T[]|*[]>}
 */
export const buildTianApi = async (apiType, params = null) => {
  const typeMap = {
    zaoan: 'morningGreeting',
    wanan: 'eveningGreeting',
    networkhot: 'networkHot',
    tianqi: 'weather',
  }
  if (!(config.TIAN_API && config.TIAN_API[typeMap[apiType]])) {
    return []
  }
  let count = config.TIAN_API[typeMap[apiType]]
  if (typeof count !== 'number') {
    count = 1
  }
  if (!(config.TIAN_API && config.TIAN_API.key)) {
    console.error('配置中config.TIAN_API.key 未填写，无法请求TIAN_API')
    return []
  }

  if (RUN_TIME_STORAGE[`${apiType}_${JSON.stringify(params)}_${count}`]) {
    console.log(`获取了相同的数据，读取缓存 >>> ${apiType}_${JSON.stringify(params)}_${count}`)
    return RUN_TIME_STORAGE[`${apiType}_${JSON.stringify(params)}_${count}`]
  }

  const url = `http://api.tianapi.com/${apiType}/index`
  const res = await axios.get(url, {
    params: { key: config.TIAN_API.key, ...params },
  }).catch((err) => err)

  if (res && res.data && res.data.code === 200) {
    const result = (res.data.newslist || []).slice(0, count)

    RUN_TIME_STORAGE[`${apiType}_${JSON.stringify(params)}_${count}`] = cloneDeep(result)

    return result
  }

  console.error(`获取天行API接口 ${apiType} 发生错误: `, res.data || res)
  return []
}

/**
 * 天行-早安心语
 * @returns {Promise<T>}
 */
export const getTianApiMorningGreeting = () => buildTianApi('zaoan').then((res) => res[0] && res[0].content)

/**
 * 天行-晚安心语
 * @returns {Promise<T>}
 */
export const getTianApiEveningGreeting = () => buildTianApi('wanan').then((res) => res[0] && res[0].content)

/**
 * 天行-天气（付费）
 * @param user
 * @returns {Promise<[]>|Promise<never>|Promise<AxiosResponse<any>>}
 */
export const getTianApiWeather = async (user) => buildTianApi('tianqi', { city: user.city || config.CITY })

/**
 * 天行-每日热搜
 * @returns {Promise<[]>|Promise<never>|Promise<AxiosResponse<any>>}
 * @param type
 */
export const getTianApiNetworkHot = async (type = 'default') => {
  let result = ''
  const res = await buildTianApi('networkhot')
  res.forEach((item, index) => {
    if (item.digest) {
      result += `${index + 1}、 ${type === 'default' ? item.digest : item.title} ${getLB()}`
    }
  })
  return result
}

/**
 * 获取全部处理好的用户数据
 * @returns
 */
// istanbul ignore next
export const getAggregatedData = async () => {
  const weekList = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  // 获取金山词霸每日一句
  const {
    noteEn = DEFAULT_OUTPUT.noteEn,
    wxNoteEn = '',
    noteCh = DEFAULT_OUTPUT.noteCh,
    wxNoteCh = ''
  } = await getCIBA()
  // 获取下一休息日
  const {holidaytts, wxHolidaytts} = await getHolidaytts()
  // 获取每日一言
  const {
    hitokoto: oneTalk = DEFAULT_OUTPUT.oneTalk,
    wx_one_talk: wxOneTalk = '',
    from: talkFrom = DEFAULT_OUTPUT.talkFrom,
  } = await getOneTalk(config.LITERARY_PREFERENCE)
  // 获取土味情话
  const {earthyLoveWords, wxEarthyLoveWords} = await getEarthyLoveWords()
  // 获取朋友圈文案
  const {momentCopyrighting, wxMomentCopyrighting} = await getMomentCopyrighting()
  // 获取毒鸡汤
  const {poisonChickenSoup, wxPoisonChickenSoup} = await getPoisonChickenSoup()
  // 获取古诗古文 poetry
  const {
    dynasty: poetryDynasty = DEFAULT_OUTPUT.poetryDynasty,
    author: poetryAuthor = DEFAULT_OUTPUT.poetryAuthor,
    title: poetryTitle = DEFAULT_OUTPUT.poetryTitle,
    content: poetryContent,
    wxContent: wxPoetryContent
  } = await getPoetry()
  // 获取插槽中的数据
  const slotParams = getSlotList().map((item) => ({ name: item.keyword, value: item.checkout, color: getColor() }))

  if (Object.prototype.toString.call(config.USERS) !== '[object Array]') {
    console.error('配置文件中找不到USERS数组')
    throw new Error('配置文件中找不到USERS数组')
  }
  const users = config.USERS
  for (const user of users) {
    // 获取每日天气
    const useProvince = user.province || config.PROVINCE
    const useCity = user.city || config.CITY
    const weatherInfo = await getWeather(useProvince, useCity)
    const weatherMessage = Object.keys(weatherInfo).map((item) => ({
      name: toLowerLine(item),
      value: weatherInfo[item] || '获取失败',
      color: getColor(),
    }))

    // 统计日列表计算日期差
    const dateDiffParams = getDateDiffList(user.customizedDateList).map((item) => ({
      name: item.keyword,
      value: item.diffDay,
      color: getColor(),
    }))

    // 获取生日/生日信息
    const { resMessage: birthdayMessage, wechatTestBirthdayMessage } = getBirthdayMessage(user.festivals)

    // 获取星座运势
    const constellationFortune = await getConstellationFortune(user.horoscopeDate, user.horoscopeDateType)

    // 获取课表信息
    const {schedule:courseSchedule, wechatTestCourseSchedule} = getCourseSchedule(user.courseSchedule || config.courseSchedule) || DEFAULT_OUTPUT.courseSchedule

    // 天行-早晚安
    const tianApiGreeting = [{
      name: toLowerLine('tianApiMorningGreeting'),
      value: await getTianApiMorningGreeting(),
      color: getColor(),
    }, {
      name: toLowerLine('tianApiEveningGreeting'),
      value: await getTianApiEveningGreeting(),
      color: getColor(),
    }].filter((it) => it.value)

    // 天行-天气
    const tianApiWeather = (await getTianApiWeather(user) || []).map((it, index) => Object.keys((it)).filter((weatherKey) => ['province', 'area', 'weatherimg'].indexOf(weatherKey) === -1).map((key) => ({
      name: toLowerLine(`tianApiWeather_${key}_${index}`),
      value: it[key],
      color: getColor(),
    }))).flat()

    // 天行-热榜
    const tianApiNetworkHot = [{
      name: toLowerLine('tianApiNetworkHot'),
      value: await getTianApiNetworkHot(config.TIAN_API && config.TIAN_API.networkHotType),
      color: getColor(),
    }]
    // 集成所需信息
    const wxTemplateParams = [
      { name: toLowerLine('toName'), value: user.name, color: getColor() },
      {
        name: toLowerLine('date'),
        value: `${selfDayjs().format('YYYY-MM-DD')} ${weekList[selfDayjs().format('d')]}`,
        color: getColor(),
      },
      { name: toLowerLine('province'), value: user.province || config.PROVINCE, color: getColor() },
      { name: toLowerLine('city'), value: user.city || config.CITY, color: getColor() },
      { name: toLowerLine('birthdayMessage'), value: birthdayMessage, color: getColor() },
      { name: toLowerLine('noteEn'), value: noteEn, color: getColor() },
      { name: toLowerLine('noteCh'), value: noteCh, color: getColor() },
      { name: toLowerLine('holidaytts'), value: holidaytts, color: getColor() },
      { name: toLowerLine('oneTalk'), value: oneTalk, color: getColor() },
      { name: toLowerLine('talkFrom'), value: talkFrom, color: getColor() },
      { name: toLowerLine('earthyLoveWords'), value: earthyLoveWords, color: getColor() },
      { name: toLowerLine('momentCopyrighting'), value: momentCopyrighting, color: getColor() },
      { name: toLowerLine('poisonChickenSoup'), value: poisonChickenSoup, color: getColor() },
      { name: toLowerLine('poetryContent'), value: poetryContent, color: getColor() },
      { name: toLowerLine('poetryAuthor'), value: poetryAuthor, color: getColor() },
      { name: toLowerLine('poetryDynasty'), value: poetryDynasty, color: getColor() },
      { name: toLowerLine('poetryTitle'), value: poetryTitle, color: getColor() },
      { name: toLowerLine('courseSchedule'), value: courseSchedule, color: getColor() },
    ].concat(weatherMessage)
      .concat(constellationFortune)
      .concat(dateDiffParams)
      .concat(slotParams)
      .concat(tianApiGreeting)
      .concat(tianApiWeather)
      .concat(tianApiNetworkHot)
      .concat(wechatTestBirthdayMessage)
      .concat(wechatTestCourseSchedule)
      .concat(wxNoteEn)
      .concat(wxNoteCh)
      .concat(wxOneTalk)
      .concat(wxEarthyLoveWords)
      .concat(wxMomentCopyrighting)
      .concat(wxPoisonChickenSoup)
      .concat(wxPoetryContent)
      .concat(wxHolidaytts)

    user.wxTemplateParams = wxTemplateParams
  }

  return users
}

/**
 * 本地模板拼装
 * @param templateId
 * @param wxTemplateData
 * @param urlencode
 * @param turnToOA \n转换成 %0A
 * @returns {{title: string, desc: string}|null}
 */
export const model2Data = (templateId, wxTemplateData, urlencode = false, turnToOA = false) => {
  if (!templateId || !wxTemplateData) {
    console.log('templateId:', templateId)
    console.log('wxTemplateData:', wxTemplateData)
    console.log('发生错误，templateId 或 wxTemplateData 不能为 null')
    return null
  }
  let targetValue = null
  // 获取模板
  const model = TEMPLATE_CONFIG.find((o) => o.id === templateId)

  if (!model) {
    console.log(`TEMPLATE_CONFIG中找不到模板id为 ${templateId} 的模板`)
    return null
  }

  // 替换模板
  targetValue = model.desc.replace(/\{{2}(.*?)\.DATA}{2}/gm, (paramText) => {
    // 提取变量
    const param = paramText.match(/\{{2}(.*?)\.DATA}{2}/)
    const replaceText = wxTemplateData[param[1]]
    return replaceText && (replaceText.value || replaceText.value === 0) ? replaceText.value : ''
  })
  // 清除每行前的空格
  targetValue = targetValue.replace(/(?<=\\n|^) +/gm, '')

  // urlencode
  if (urlencode) {
    // json序列化
    targetValue = JSON.stringify(targetValue)
    // 去除前后双引号
    targetValue = targetValue.substring(1, targetValue.length - 1)
    // urlencode
    model.title = encodeURI(model.title)
    targetValue = encodeURI(targetValue)
  }

  // \n转换成 %0A
  if (turnToOA) {
    targetValue = targetValue.replace(/%5Cn+/g, '%0A%0A')
  }

  return {
    title: model.title,
    desc: targetValue,
  }
}

/**
 * 获取处理好的回执消息
 * @param {*} messageReply
 * @returns
 */
// istanbul ignore next
export const getCallbackTemplateParams = (messageReply) => {
  const postTimeZone = timeZone()
  const postTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
  return [
    { name: toLowerLine('postTimeZone'), value: postTimeZone, color: getColor() },
    { name: toLowerLine('postTime'), value: postTime, color: getColor() },
    { name: toLowerLine('needPostNum'), value: messageReply.needPostNum, color: getColor() },
    { name: toLowerLine('successPostNum'), value: messageReply.successPostNum, color: getColor() },
    { name: toLowerLine('failPostNum'), value: messageReply.failPostNum, color: getColor() },
    { name: toLowerLine('successPostIds'), value: messageReply.successPostIds, color: getColor() },
    { name: toLowerLine('failPostIds'), value: messageReply.failPostIds, color: getColor() },
  ]
}

// 组装openUrl
const assembleOpenUrl = () => ''

/**
 * 使用pushDeer
 * @param user
 * @param templateId
 * @param wxTemplateData
 * @returns {Promise<{success: boolean, name}>}
 */
const sendMessageByPushDeer = async (user, templateId, wxTemplateData) => {
  // 模板拼装
  const modelData = model2Data(templateId, wxTemplateData, false, false)
  if (!modelData) {
    return {
      name: user.name,
      success: false,
    }
  }

  const url = 'https://api2.pushdeer.com/message/push'

  // 发送消息
  const res = await axios.post(url, {
    pushkey: user.id,
    text: modelData.title,
    desp: modelData.desc,
    type: 'markdown',
  }, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    },
  }).catch((err) => err)

  if (res.data && res.data.code === 0) {
    console.log(`${user.name}: 推送消息成功`)
    return {
      name: user.name,
      success: true,
    }
  }
  console.error(`${user.name}: 推送消息失败`, res)
  return {
    name: user.name,
    success: false,
  }
}

/**
 * 使用pushplus
 * @param user
 * @param templateId
 * @param wxTemplateData
 * @returns {Promise<{success: boolean, name}>}
 */
const sendMessageByPushPlus = async (user, templateId, wxTemplateData) => {
  // 模板拼装
  const modelData = model2Data(templateId, wxTemplateData, false, false)
  if (!modelData) {
    return {
      name: user.name,
      success: false,
    }
  }

  const url = 'http://www.pushplus.plus/send'
  // 发送消息
  const res = await axios.post(url, {
    token: user.id,
    title: modelData.title,
    content: modelData.desc,
    template: 'markdown',
  }, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).catch((err) => err)

  if (res.data && res.data.code === 200) {
    console.log(`${user.name}: 推送消息成功`)
    return {
      name: user.name,
      success: true,
    }
  }
  console.error(`${user.name}: 推送消息失败`, res)
  return {
    name: user.name,
    success: false,
  }
}

/**
 * 使用server-chan
 * @param user
 * @param templateId
 * @param wxTemplateData
 * @returns {Promise<{success: boolean, name}>}
 */
const sendMessageByServerChan = async (user, templateId, wxTemplateData) => {
  // 模板拼装
  const modelData = model2Data(templateId, wxTemplateData, false, false)
  if (!modelData) {
    return {
      name: user.name,
      success: false,
    }
  }

  const url = `https://sctapi.ftqq.com/${user.id}.send`
  // 发送消息
  const res = await axios.post(url, {
    title: modelData.title,
    desp: modelData.desc,
  }).catch((err) => err)

  if (res.data && res.data.code === 0) {
    console.log(`${user.name}: 推送消息成功`)
    return {
      name: user.name,
      success: true,
    }
  }
  console.error(`${user.name}: 推送消息失败`, res)
  return {
    name: user.name,
    success: false,
  }
}

/**
 * 使用wechat-test
 * @param user
 * @param templateId
 * @param wxTemplateData
 * @returns {Promise<{success: boolean, name}>}
 */
const sendMessageByWeChatTest = async (user, templateId, wxTemplateData) => {
  let accessToken = null

  if (RUN_TIME_STORAGE.accessToken) {
    console.log('获取了相同的数据，读取缓存 >>> accessToken')
    accessToken = RUN_TIME_STORAGE.accessToken
  } else {
    accessToken = await getAccessToken()
    RUN_TIME_STORAGE.accessToken = accessToken
  }

  if (!accessToken) {
    return {
      name: user.name,
      success: false,
    }
  }

  const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`
  const data = {
    touser: user.id,
    template_id: templateId,
    url: assembleOpenUrl(),
    topcolor: '#FF0000',
    data: wxTemplateData,
  }

  // 发送消息
  const res = await axios.post(url, data, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36',
    },
  }).catch((err) => err)

  if (res.data && res.data.errcode === 0) {
    console.log(`${user.name}: 推送消息成功`)
    return {
      name: user.name,
      success: true,
    }
  }

  if (res.data && res.data.errcode === 40003) {
    console.error(`${user.name}: 推送消息失败! id填写不正确！应该填用户扫码后生成的id！要么就是填错了！请检查配置文件！`)
  } else if (res.data && res.data.errcode === 40036) {
    console.error(`${user.name}: 推送消息失败! 模板id填写不正确！应该填模板id！要么就是填错了！请检查配置文件！`)
  } else {
    console.error(`${user.name}: 推送消息失败`, res.data)
  }

  return {
    name: user.name,
    success: false,
  }
}

/**
 * 执行发送消息
 * @param templateId
 * @param user
 * @param params
 * @param usePassage
 * @returns {Promise<{success: boolean, name}>}
 */
export const sendMessage = async (templateId, user, params, usePassage) => {
  const wxTemplateData = {}
  if (Object.prototype.toString.call(params) === '[object Array]') {
    params.forEach((item) => {
      if (item && item.name) {
        wxTemplateData[item.name] = {
          value: item.value,
          color: item.color,
        }
      }
    })
  }

  if (usePassage === 'push-deer') {
    console.log('使用push-deer推送')
    return sendMessageByPushDeer(user, templateId, wxTemplateData)
  } if (usePassage === 'server-chan') {
    console.log('使用server-chan推送')
    return sendMessageByServerChan(user, templateId, wxTemplateData)
  } if (usePassage === 'push-plus') {
    console.log('使用push-plus推送')
    return sendMessageByPushPlus(user, templateId, wxTemplateData)
  }

  console.log('使用微信测试号推送')
  return sendMessageByWeChatTest(user, templateId, wxTemplateData)
}

/**
 * 推送消息, 进行成功失败统计
 * @param users
 * @param templateId
 * @param params
 * @param usePassage
 * @returns {Promise<{failPostIds: (string|string), failPostNum: number, successPostIds: (string|string), needPostNum: *, successPostNum: number}>}
 */
export const sendMessageReply = async (users, templateId = null, params = null, usePassage = null) => {
  const resList = []
  const needPostNum = users.length
  let successPostNum = 0
  let failPostNum = 0
  const successPostIds = []
  const failPostIds = []

  const maxPushOneMinute = typeof config.MAX_PUSH_ONE_MINUTE === 'number' && config.MAX_PUSH_ONE_MINUTE > 0 ? config.MAX_PUSH_ONE_MINUTE : 5
  for (const user of users) {
    if (RUN_TIME_STORAGE.pushNum >= maxPushOneMinute) {
      RUN_TIME_STORAGE.pushNum = 0
      // 请求超过N个则等待60秒再发送
      console.log(`单次脚本已发送 ${maxPushOneMinute} 条消息，为避免推送服务器识别为恶意推送，脚本将休眠 ${config.SLEEP_TIME ? config.SLEEP_TIME / 1000 : 65} 秒。休眠结束后将自动推送剩下的消息。`)
      await sleep(config.SLEEP_TIME || 65000)
    }
    resList.push(await sendMessage(
      templateId || user.useTemplateId,
      user,
      params || user.wxTemplateParams,
      usePassage,
    ))
    if (RUN_TIME_STORAGE.pushNum) {
      RUN_TIME_STORAGE.pushNum += 1
    } else {
      RUN_TIME_STORAGE.pushNum = 1
    }
  }
  resList.forEach((item) => {
    if (item.success) {
      successPostNum++
      successPostIds.push(item.name)
    } else {
      failPostNum++
      failPostIds.push(item.name)
    }
  })

  return {
    needPostNum,
    successPostNum,
    failPostNum,
    successPostIds: successPostIds.length ? successPostIds.join(',') : '无',
    failPostIds: failPostIds.length ? failPostIds.join(',') : '无',
  }
}
