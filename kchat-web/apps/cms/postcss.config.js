// kchat-web/apps/cms/postcss.config.js
// PostCSS config riêng cho kchat-web — override Rails root postcss.config.js
// Chỉ dùng autoprefixer (không cần postcss-preset-env hay tailwind)

export default {
  plugins: {
    autoprefixer: {},
  },
}
