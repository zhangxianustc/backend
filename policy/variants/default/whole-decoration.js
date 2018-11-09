const { TASK_TYPES } = require('../../../const')
const { Project, Task } = require('gantt-engine')

module.exports = async function wholeDecorationProjectFactory (principal) {
  let beForeman = await principal.can('be.foreman')
  let beCustomer = await principal.can('be.customer')
  let beAccountant = await principal.can('be.accountant')

  const opsFilter = function opsFilter (ops) {
    ops = ops || []
    let { type } = this.bundle() || {}
    if (type === TASK_TYPES.CONSTRUCT) {
      // only foreman can operate
      return beForeman ? ops : []
    }
    if (type === TASK_TYPES.PAY) {
      if (beCustomer) {
        return ops[0] === Task.OP_START ? [Task.OP_START] : []
      }
      if (beAccountant) {
        return ~ops.indexOf(Task.OP_FINISH) ? [Task.OP_FINISH] : []
      }
      return []
    }
    if (type === TASK_TYPES.VERIFICATION) {
      if (beCustomer && ops[0] === Task.OP_FINISH) {
        return [Task.OP_FINISH]
      } else if (beForeman && ops[0] === Task.OP_START) {
        return [Task.OP_START]
      }
      return []
    }
    return ops
  }

  return new Project('全包工程')
    .addSubTask(t => t
      .name('第一期')
      .addSubTask(t => t
        .name('水电改造')
        .expectedTimeSpan('10d')
        .bundle({ type: TASK_TYPES.CONSTRUCT })
        .description('只能由云工长发起并且结束')
        .opsFilter(opsFilter)
      )
      .addSubTask(t => t
        .name('工程验收')
        .expectedTimeSpan('5d')
        .bundle({ type: TASK_TYPES.VERIFICATION })
        .opsFilter(opsFilter)
        .description('由云工长发起, 由客户结束')
        .dependsUpon(
          ['第一期', '水电改造']
        )
      )
      .addSubTask(t => t
        .name('上传中期款支付凭证')
        .expectedTimeSpan('3d')
        .description('由客户发起，由财务结束')
        .bundle({ type: TASK_TYPES.PAY })
        .opsFilter(opsFilter)
        .dependsUpon(['第一期', '工程验收'])
      )
    )
    .addSubTask(t => t
      .name('第二期')
      .dependsUpon(['第一期'])
      .addSubTask(t => t
        .name('木瓦工程')
        .expectedTimeSpan('15d')
        .description('由工长发起并结束')
        .bundle({ type: TASK_TYPES.CONSTRUCT })
        .opsFilter(opsFilter)
      )
      .addSubTask(
        t => t
          .name('油漆工程')
          .expectedTimeSpan('18d')
          .description('由云工长发起并结束')
          .bundle({ type: TASK_TYPES.CONSTRUCT })
          .opsFilter(opsFilter)
      )
      .addSubTask(t => t
        .name('工程验收')
        .description('由云工长发起, 由客户结束')
        .expectedTimeSpan('3d')
        .bundle({ type: TASK_TYPES.VERIFICATION })
        .dependsUpon(
          ['第二期', '木瓦工程'],
          ['第二期', '油漆工程']
        )
      )
      .addSubTask(t => t
        .name('上传尾款支付凭证')
        .expectedTimeSpan('3d')
        .description('由客户发起，由财务结束')
        .bundle({ type: TASK_TYPES.PAY })
        .opsFilter(opsFilter)
        .dependsUpon(['第二期', '工程验收'])
      )
    )
    .addSubTask(t => t
      .name('第三期')
      .dependsUpon(['第二期'])
      .addSubTask(
        t => t.name('家具家电安装')
          .expectedTimeSpan('3d')
          .description('只能由云工长发起并且结束')
          .bundle({ type: TASK_TYPES.CONSTRUCT })
      )
      .addSubTask(t => t
        .name('工程验收')
        .bundle({ type: TASK_TYPES.VERIFICATION })
        .description('由云工长发起, 由客户结束')
        .expectedTimeSpan('3d')
        .dependsUpon(['第三期', '家具家电安装'])
      )
    )
}
