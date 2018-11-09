const baseGetter = require('../util/base-getter')
const jyi = require('jyi')
const getBasePrincipal = require('../util/get-base-principal')

exports.frontPageBannerList = () => baseGetter.get('front_page_banner_list')

exports.needs = async () => {
  let principal = await getBasePrincipal()
  let needs = await jyi.loadFile('./policy/principal.yml')('needs')
  return needs.map(value => {
    let description = ''
    if (Array.isArray(value)) {
      description = value[1]
      value = value[0]
    }
    return {
      value,
      label: principal.resolveNeed(value).label,
      description
    }
  })
}
