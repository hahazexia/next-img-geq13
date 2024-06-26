import path from 'path';
import fs from 'fs';

function nextImg({ dynamicAssetPrefix = false, ...nextConfig } = {}) {
  const packageUrl = path.resolve(process.cwd(), './package.json');
  const packageStr = fs.readFileSync(packageUrl, 'utf-8');
  const packageObj = JSON.parse(packageStr);

  const nextVersion = packageObj?.dependencies?.next || '';

  if (!packageObj?.dependencies?.next) {
    throw new Error(`cannot find next in dependencies`);
  }
  const majorVersion = nextVersion.split('.')[0].replace(/[^\d]/g, '');
  if (majorVersion >= 13) {
    return Object.assign({}, nextConfig, {
      webpack(config, options) {
        nextConfig = Object.assign({
          inlineImageLimit: 8192,
          assetPrefix: "",
          basePath: "",
          fileExtensions: ["jpg", "jpeg", "png", "svg", "gif", "ico", "webp", "jp2", "avif"],
        }, nextConfig);
        config.module.rules.push({
          test: new RegExp(`\\.(${nextConfig.fileExtensions.join('|')})$`),
          type: 'asset',
          generator: {
            filename: `static/images/[name]-[hash][ext]`,
          },
        });
        if (typeof nextConfig.webpack === 'function') {
          return nextConfig.webpack(config, options)
        }

        return config
      }
    });
  } else {
    return Object.assign({}, nextConfig, {
      serverRuntimeConfig: dynamicAssetPrefix
        ? Object.assign({}, nextConfig.serverRuntimeConfig, {
          nextImagesAssetPrefix: nextConfig.assetPrefix || nextConfig.basePath,
        })
        : nextConfig.serverRuntimeConfig,
      webpack(config, options) {
        const { isServer } = options;
        nextConfig = Object.assign({
          inlineImageLimit: 8192,
          assetPrefix: "",
          basePath: "",
          fileExtensions: ["jpg", "jpeg", "png", "svg", "gif", "ico", "webp", "jp2", "avif"],
        }, nextConfig);
  
        if (!options.defaultLoaders) {
          throw new Error(
            'This plugin is not compatible with Next.js versions below 5.0.0 https://err.sh/next-plugins/upgrade'
          )
        }
  
        config.module.rules.push({
          test: new RegExp(`\\.(${nextConfig.fileExtensions.join('|')})$`),
          // Next.js already handles url() in css/sass/scss files
          issuer: new RegExp('\\.\\w+(?<!(s?c|sa)ss)$', 'i'),
          exclude: nextConfig.exclude,
          use: [
            {
              loader: require.resolve("url-loader"),
              options: {
                limit: nextConfig.inlineImageLimit,
                fallback: require.resolve("file-loader"),
                outputPath: `${isServer ? "../" : ""}static/images/`,
                ...(dynamicAssetPrefix
                  ? {
                      publicPath: `${
                        isServer ? '/_next/' : ''
                      }static/images/`,
                      postTransformPublicPath: (p) => {
                        if (isServer) {
                          return `(require("next/config").default().serverRuntimeConfig.nextImagesAssetPrefix || '') + ${p}`;
                        }
  
                        return `(__webpack_public_path__ || '') + ${p}`;
                      },
                    }
                  : {
                      publicPath: `${
                        nextConfig.assetPrefix ||
                        nextConfig.basePath ||
                        ''
                      }/_next/static/images/`,
                    }),
                name: nextConfig.name || "[name]-[hash].[ext]",
                esModule: nextConfig.esModule || false
              }
            }
          ]
        });
  
        if (typeof nextConfig.webpack === 'function') {
          return nextConfig.webpack(config, options)
        }
  
        return config
      }
    })
  }
}

export { nextImg as default };
