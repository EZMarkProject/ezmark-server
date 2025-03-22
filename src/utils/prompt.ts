export const HEADER_PROMPT = `
# 任务
识别出卷头学生手写体的姓名和学号

## 规则
1. 识别出学生手写体的姓名和学号
2. 返回符合schema要求的JSON
3. 学号通常为8位数字,如果你没有识别到8位,说明大概率错误了,再努力试试
4. 如果无法识别,返回Unknown
`

export const MCQ_PROMPT = `
`