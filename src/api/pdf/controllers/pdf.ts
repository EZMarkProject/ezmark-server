import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export default {
    // 获取PDF列表
    async find(ctx) {
        // 处理列表请求的逻辑
        if (!ctx.params.id) {
            return ctx.send({
                data: {
                    message: 'DocumentID is required'
                }
            });
        }

        try {
            // 从参数中获取documentId
            const documentId = ctx.params.id;
            const URL = `https://csi420-01-vm7.ucd.ie/render/${documentId}`;
            // 从请求头获取JWT
            const JWT = ctx.request.header.authorization;

            // 确保目录存在
            const pdfDir = path.resolve('./public/pdf');
            if (!fs.existsSync(pdfDir)) {
                fs.mkdirSync(pdfDir, { recursive: true });
            }

            // 删除目录中所有文件
            fs.readdirSync(pdfDir).forEach(file => {
                fs.unlinkSync(path.join(pdfDir, file));
            });

            // 使用puppeteer生成pdf
            const pdfFileName = `Exam-${documentId}.pdf`;
            const pdfPath = path.join(pdfDir, pdfFileName);

            console.log(`开始生成pdf文件 ${documentId}`);
            const browser = await puppeteer.launch(
                process.env.NODE_ENV === 'development' ? {} : {
                    executablePath: '/usr/bin/chromium-browser' // 生产环境需要指定浏览器路径
                }
            );
            console.log(`浏览器启动成功 ${documentId}`);
            const page = await browser.newPage();
            console.log(`页面启动成功 ${documentId}`);
            await page.setExtraHTTPHeaders({
                'Authorization': JWT
            });
            console.log(`开始进入网页 ${documentId}`);
            await page.goto(URL, { waitUntil: 'networkidle0' });
            console.log(`进入网页成功 ${documentId}`);
            await page.pdf({ path: pdfPath, format: 'A4', margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' } });
            console.log(`pdf生成成功 ${documentId}`);
            await browser.close();
            console.log(`浏览器关闭 ${documentId}`);

            // 检查文件是否生成成功
            if (!fs.existsSync(pdfPath)) {
                return ctx.badRequest('PDF generation failed');
            }

            // 返回文件URL（相对路径，由Strapi的静态文件中间件处理）
            return ctx.send({
                data: {
                    url: `${process.env.NODE_ENV === 'development' ? 'http://localhost:1337' : 'https://csi420-01-vm7.ucd.ie/strapi'}/pdf/${pdfFileName}`
                }
            });
        } catch (error) {
            return ctx.badRequest('PDF generation failed');
        }
    }

};
