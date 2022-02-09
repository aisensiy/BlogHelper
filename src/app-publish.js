const yaml = require('yaml')
const util = require('./common/app-util');
const string = require('./common/app-string');
const fs = require('fs');
const appUpload = require('./app-upload');

const cnblogs = require('./blog/cnblogs');
const csdn = require('./blog/csdn');
const juejin = require('./blog/juejin');
const oschina = require('./blog/oschina');
const segmentfault = require('./blog/segmentfault');
const zhihu = require('./blog/zhihu');
const jianshu = require('./blog/jianshu');

const removeFrontmatter = require('./remove-frontmatter');

async function parseFrontmatter(text) {
  const { unified } = await import('unified')
  const parser = await import('remark-parse')
  const frontmatter = await import('remark-frontmatter')
  const result = unified()
    .use(parser.default)
    .use(frontmatter.default, ['yaml'])
    .parse(text)
  if (result.children[0].type === 'yaml') {
    return yaml.parse(result?.children[0].value)
  } else {
    return {}
  }
}

async function parseToHtml(text) {
  const { unified } = await import('unified')
  const parser = await import('remark-parse')
  const gfm = await import('remark-gfm')
  const frontmatter = await import('remark-frontmatter')
  const stringify = await import('rehype-stringify')
  const rehype = await import('remark-rehype')
  const result = await unified()
    .use(parser.default)
    .use(frontmatter.default)
    .use(gfm.default)
    .use(rehype.default)
    .use(stringify.default)
    .process(text)

  return String(result)
}

async function parseToMd(text) {
  const { unified } = await import('unified')
  const parser = await import('remark-parse')
  const frontmatter = await import('remark-frontmatter')
  const stringify = await import('remark-stringify')
  const result = await unified()
    .use(parser.default)
    .use(frontmatter.default)
    .use(removeFrontmatter)
    .use(stringify.default)
    .process(text)

  return String(result)
}

// 发布文章到平台
const publishArticleTo = (title, content, dirname, site, isPublish) => {
    return new Promise(async (resolve, reject) => {
        // 1.参数校验
        if (title == null || title.length < 1) {
            reject('文章标题为空')
        }
        if (content == null || content.length < 1) {
            reject('文章内容为空')
        }
        if (dirname == null || dirname.length < 1 || !fs.existsSync(dirname)) {
            reject('文章所在目录不存在')
        }
        if (site == null || site.length < 1) {
            reject('博客站点为空')
        }
        // 2.上传图片
        let list = [];
        util.readImgLink(content, (src) => {
            list.push(src)
        });
        let text = content;
        let mark = {next: true};
        for (let src of list) {
            // 可能是网络地址、本地绝对、相对地址、是否图片
            if (util.isLocalPicture(src)) {
                //图片的真实路径
                const all_src = util.relativePath(dirname, src);
                // 非本地图片不上传
                if (!fs.existsSync(all_src)) {
                    continue
                }
                switch (site) {
                    case string.cnblogs:
                        await cnblogs.uploadPictureToCnBlogs(all_src)
                            .then(value => {
                                text = text.replace(src, value.toString())
                            })
                            .catch(reason => {
                                mark.next = false;
                                reject(reason.toString())
                            });
                        break;
                    case string.csdn:
                        await csdn.uploadPictureToCSDN(all_src)
                            .then(value => {
                                text = text.replace(src, value.toString())
                            })
                            .catch(reason => {
                                mark.next = false;
                                reject(reason.toString())
                            });
                        break;
                    case string.oschina:
                        await oschina.uploadPictureToOsChina(all_src)
                            .then(value => {
                                text = text.replace(src, value.toString())
                            })
                            .catch(reason => {
                                mark.next = false;
                                reject(reason.toString())
                            });
                        break;
                    case string.segmentfault:
                        await segmentfault.uploadPictureToSegmentFault(all_src)
                            .then(value => {
                                text = text.replace(src, value.toString())
                            })
                            .catch(reason => {
                                mark.next = false;
                                reject(reason.toString())
                            });
                        break;
                    case string.jianshu:
                        await jianshu.uploadPictureToJianShu(all_src)
                            .then(value => {
                                text = text.replace(src, value.toString())
                            })
                            .catch(reason => {
                                mark.next = false;
                                reject(reason.toString())
                            });
                        break;
                    case string.zhihu:
                        await appUpload.uploadPicture(all_src)
                            .then(async value => {
                                await zhihu.uploadPictureToZhiHu(value.toString())
                                    .then(value1 => {
                                        text = text.replace(src, value1.toString())
                                    }).catch(reason => {
                                        mark.next = false;
                                        reject(reason.toString())
                                    })
                            }).catch(reason => {
                                mark.next = false;
                                reject(reason.toString() + "【因知乎的特殊性，请尝试切换其它图床】")
                            });
                        break;
                    case string.juejin:
                        await appUpload.uploadPicture(all_src)
                            .then(async value => {
                                await juejin.uploadPictureToJueJin(value.toString())
                                    .then(value1 => {
                                        text = text.replace(src, value1.toString())
                                    }).catch(reason => {
                                        mark.next = false;
                                        reject(reason.toString())
                                    })
                            })
                            .catch(reason => {
                                mark.next = false;
                                reject(reason.toString() + "【因掘金的特殊性，请尝试切换其它图床】")
                            });
                        break;
                }
            }
        }
        if (!mark.next) {
            return
        }
        const frontmatter = await parseFrontmatter(text);
        const htmlContent = await parseToHtml(text);
        const markdownContent = await parseToMd(text);
        // 3.发布文章
        switch (site) {
            case string.cnblogs:
                await cnblogs.publishArticleToCnBlogs(title, text, isPublish)
                    .then(url => {
                        resolve(url)
                    })
                    .catch(reason => {
                        reject(reason)
                    });
                break;
            case string.csdn:
                await csdn.publishArticleToCSDN(frontmatter.title || title, markdownContent, htmlContent, isPublish)
                    .then(url => {
                        resolve(url)
                    })
                    .catch(reason => {
                        reject(reason)
                    });
                break;
            case string.juejin:
                await juejin.publishArticleToJueJin(frontmatter.title || title, markdownContent, htmlContent, isPublish)
                    .then(url => {
                        resolve(url)
                    })
                    .catch(reason => {
                        reject(reason)
                    });
                break;
            case string.oschina:
                await oschina.publishArticleToOsChina(frontmatter.title || title, markdownContent, isPublish)
                    .then(url => {
                        resolve(url)
                    })
                    .catch(reason => {
                        reject(reason)
                    });
                break;
            case string.segmentfault:
                await segmentfault.publishArticleToSegmentFault(title, text, isPublish)
                    .then(url => {
                        resolve(url)
                    })
                    .catch(reason => {
                        reject(reason)
                    });
                break;
            case string.zhihu:
                await zhihu.publishArticleToZhiHu(title, text, isPublish)
                    .then(url => {
                        resolve(url)
                    })
                    .catch(reason => {
                        reject(reason)
                    });
                break;
            case string.jianshu:
                await jianshu.publishArticleToJianshu(title, text, isPublish)
                    .then(url => {
                        resolve(url)
                    })
                    .catch(reason => {
                        reject(reason)
                    });
                break
        }
    })
};
exports.publishArticleTo = publishArticleTo;
