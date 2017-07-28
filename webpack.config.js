'use strict';

const path = require('path');
const webpack = require('webpack');
const extractTextPlugin = require('extract-text-webpack-plugin');
module.exports = {
    context: path.resolve(__dirname + '/frontend'),
    entry: {main: './main.js', auth: './auth.js'},
    output: {
        path: path.resolve(__dirname + '/public/'),
        filename: 'js/[name].bandle.js'
    },
    watch: true,
    devtool: 'source-map',
    plugins: [
       /* new webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false
            }
        }),*/
        new webpack.ProvidePlugin({
            $: "jquery",
            'jQuery': "jquery"
        }),
        new extractTextPlugin({filename: 'css/[name].css', allChunks: true})
    ],
    module: {
        loaders: [{
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: [/(libraries)/, /\/node_modules\//],
            query: {
                presets: ["es2015"]
            }
        }, {
            test: /\.css$/,
            loader: extractTextPlugin.extract({use: 'css-loader', publicPath: '../'})
        }, {
            test: /\.(png|jpg|svg|ttf|eot|woff|woff2)$/,
            loader: 'url-loader?name=pics/[path][name].[ext]&limit=4096'
        }, {
            test: /\.(tpl|hbs)/,
            exclude: /(node_modules)/,
            loader: "handlebars-template-loader"
        }]
    }
}

