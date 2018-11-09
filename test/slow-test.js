const slow = require('../middlewares/slow')
const sleep = require('sleep-promise')


let arr = ["zhangxian", "28", "huijiajia"]

async function log(it){
    await console.log(it)
}

for(let it of arr){
    log(it)
    slow(1000)
}

select res_1.version_id from
(select 
    sub_1.version_id,
    sub_1.sub_version_id,
    sub_1.sub_version_name,
    sub_2.versionid,
    sub_2.sub_version_id,
    sub_2.sub_version_name 
from 
    sub_version_1 as sub_1 
left join 
    sub_version_2 as sub_2 
on 
    sub_1.sub_version_id = sub_2.sub_version_id 
and sub_1.version_id = sub_2.versionid 
where 
    sub_1.version_id 
    in 
        (select version_id from version_1)  
order by 
    sub_1.version_id, 
    sub_1.sub_version_id
) as res_1
where 
    res_1.versionid is null;

select res_1.versionid from
(select 
    sub_1.version_id,
    sub_1.sub_version_id,
    sub_1.sub_version_name,
    sub_2.versionid,
    sub_2.sub_version_id,
    sub_2.sub_version_name 
from 
    sub_version_1 as sub_1 
right join 
    sub_version_2 as sub_2 
on 
    sub_1.sub_version_id = sub_2.sub_version_id 
and sub_1.version_id = sub_2.versionid 
where 
    sub_1.version_id 
    in 
        (select version_id from version_1)  
order by 
    sub_1.version_id, 
    sub_1.sub_version_id
) as res_1
where 
    res_1.version_id is null;
