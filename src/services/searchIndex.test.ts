import { describe, expect, it } from 'vitest'
import { queryIndex } from './searchIndex'
import type { RegionMeta } from '../types'

const mock: RegionMeta[] = [
  { adcode: 330000, name: '浙江省', shortName: '浙江', fullPinyin: 'zhejiangsheng', pinyinInitials: 'zjs', level: 'province', parentAdcode: 100000, path: [] },
  { adcode: 330100, name: '杭州市', shortName: '杭州', fullPinyin: 'hangzhoushi', pinyinInitials: 'hzs', level: 'city', parentAdcode: 330000, path: ['浙江省'] },
  { adcode: 330102, name: '上城区', shortName: '上城', fullPinyin: 'shangchengqu', pinyinInitials: 'scq', level: 'district', parentAdcode: 330100, path: ['浙江省', '杭州市'] },
  { adcode: 110000, name: '北京市', shortName: '北京', fullPinyin: 'beijingshi', pinyinInitials: 'bjs', level: 'province', parentAdcode: 100000, path: [] },
]

describe('queryIndex', () => {
  it('按中文名匹配', () => {
    expect(queryIndex(mock, '浙江')).toHaveLength(1)
  })

  it('按简称匹配', () => {
    expect(queryIndex(mock, '杭')).toHaveLength(1)
  })

  it('按全拼匹配', () => {
    expect(queryIndex(mock, 'hangzhou')).toHaveLength(1)
  })

  it('按拼音首字母匹配（zjs→浙江省）', () => {
    expect(queryIndex(mock, 'zjs')[0]?.name).toBe('浙江省')
  })

  it('大小写不敏感', () => {
    expect(queryIndex(mock, 'HZ')).toHaveLength(1)
  })

  it('空查询返回空数组', () => {
    expect(queryIndex(mock, '')).toHaveLength(0)
    expect(queryIndex(mock, '  ')).toHaveLength(0)
  })

  it('结果按层级排序（省→市→区）', () => {
    const r = queryIndex(mock, 'z')
    expect(r[0]?.level).toBe('province')
  })

  it('无匹配返回空数组', () => {
    expect(queryIndex(mock, 'xyz')).toHaveLength(0)
  })
})
