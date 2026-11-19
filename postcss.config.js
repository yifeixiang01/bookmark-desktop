import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

export default {
  plugins: [
    tailwindcss(),
    autoprefixer(),
    {
      postcssPlugin: 'app-font-scale',
      OnceExit(root) {
        root.walkDecls('font-size', (decl) => {
          if (!decl.value.includes('--app-font-scale')) {
            decl.value = `calc((${decl.value}) * var(--app-font-scale, 1))`
          }
        })
      },
    },
  ],
}
