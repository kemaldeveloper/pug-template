import webpack from "webpack";
import TerserPlugin from "terser-webpack-plugin";

export const getWebpackConfig = (options = {}) => {
  const isDev = options.mode === "development";
  const webpackConfig = {
    mode: options.mode || "development",
    // devtool: isDev ? 'inline-source-map' : undefined,
    entry: {
      main: "./app/js/main.js",
    },
    output: {
      filename: "[name].bundle.js",
    },
    module: {
      rules: [
        {
          test: /\.js?$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
              plugins: ["@babel/plugin-proposal-class-properties"],
            },
          },
        },
      ],
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          extractComments: false,
        }),
      ],
    },
    plugins: [],
  };

  return webpackConfig;
};
