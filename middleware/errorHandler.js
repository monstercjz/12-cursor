/**
 * 统一错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
    console.error('错误:', err);
    
    // 开发环境下返回详细错误信息
    const error = {
        message: process.env.NODE_ENV === 'production' ? 
            '服务器内部错误' : 
            err.message,
        status: err.status || 500,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };

    res.status(error.status).json({ error });
};

module.exports = errorHandler; 