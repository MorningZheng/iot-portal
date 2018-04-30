var util = {
    renderToast: function (msg, config) {
        var className = 'notify_toast'
        var toastDom = document.getElementsByClassName(className)
        if(toastDom.length > 1) {
            console.error('className conflict')
        }
        toastDom = toastDom[0]
        if (toastDom) {
            document.body.removeChild(toastDom)
            toastDom = null
        }
        if (util.timeoutId) {
            clearTimeout(util.timeoutId)
        }
        var scale = 5  // 动画缩放倍数
        var styles = [
            'text-align: center',
            'border-radius: 5px',
            'background-color: #f7f7f7',
            'position: fixed',
            'top: 50%',
            'left: 0',
            'right: 0',
            'padding: 18px',
            'margin: auto',
            'color: #666',
            'visibility: hidden',
            'max-width: 130px',
        ]
        toastDom = this.getDom('div', className, styles)
        if (config && config.class) {
            toastDom.className += " " + config.class
        }
        toastDom.innerHTML = msg
        document.body.appendChild(toastDom)
        this.attachAnimation(toastDom)
        // 居中
        // toastDom.style.marginLeft = '-' + toastDom.getBoundingClientRect().width / 2 * scale + 'px'
        // toastDom.style.marginTop = '-' + toastDom.getBoundingClientRect().height / 2 * scale + 'px'
        util.timeoutId = setTimeout(function () {
            document.body.removeChild(toastDom)
            if (config && config.fn && typeof config.fn === 'function') {
                config.fn()
            }
            toastDom = null
        }, 1500)
    },
    renderAlert: function (msg) {
        this.renderConfirm({
            'title': msg,
            'left': '确认'
        })
    },
    renderConfirm: function (config) {
        var wrapperClassName = 'notify_confirm_wrapper'
        var wrapperConfirm = document.getElementsByClassName(wrapperClassName)
        if(wrapperConfirm.length > 1) {
            console.error('className conflict')
        }
        wrapperConfirm = wrapperConfirm[0]
        if (wrapperConfirm) {
            document.body.removeChild(wrapperConfirm)
            wrapperConfirm = null
        }
        wrapperConfirm = this.getDom('div', wrapperClassName)
        if (config.class) {
            wrapperConfirm.className += ' ' + config.class
        }
        confirmDom = this.getDom('div', 'notify_confirm', [
            'text-align: center',
            'border: solid 1px #e0e0e0',
            'border-radius: 5px',
            'background-color: #fff',
            'position: fixed',
            'right: 0',
            'left: 0',
            'top: 50%',
            'margin: auto',
            'color: #666',
            'visibility: hidden',
            'width: 251px'
        ])
        // render modal
        if (config.modal) {
            var modal = this.getDom('div', 'notify_confirm_modal', [
                'position: fixed',
                'top: 0',
                'bottom: 0',
                'right: 0',
                'left: 0',
                'background-color: #000',
                'opacity: 0.7'
            ])
            wrapperConfirm.appendChild(modal)
        }
        wrapperConfirm.appendChild(confirmDom)
        // render title
        var titleDom = this.getDom('div', 'notify_confirm_title', [
            'text-align: left',
            'color: #666',
            'padding: 23px 12px',
            'border-bottom: solid 1px #e0e0e0',
            'max-height: 200px',
            'word-break: break-all'
        ])
        titleDom.innerText = config.title
        confirmDom.appendChild(titleDom)

        // render button
        var lb, rb
        if (config.right) {
            lb = this.getDom('div', 'notify_confirm_rb', [
                'float: left',
                'border-right: solid 1px #e0e0e0',
                'width: 125px',
                'height: 44px',
                'line-height: 44px',
                'cursor: pointer'
            ])
            lb.innerText = config.left
            lb.dataset.index = 'fail'
            confirmDom.appendChild(lb)
            rb = this.getDom('div', 'notify_confirm_lb', [
                'float: right',
                'width: 125px',
                'height: 44px',
                'line-height: 44px',
                'cursor: pointer'
            ])
            rb.dataset.index = 'success'
            rb.innerText = config.right
            confirmDom.appendChild(rb)
        } else {
            lb = this.getDom('div', 'notify_confirm_bb', [
                'height: 44px',
                'line-height: 44px',
                'cursor: pointer'
            ])
            lb.innerText = config.left
            lb.dataset.index = 1
            confirmDom.appendChild(lb)
        }

        // 点击
        wrapperConfirm.addEventListener('click', function (e) {
            if (config.fn) {
                config.fn(e.target.dataset.index)
            }
            if (e.target.dataset.index || config.modal) {
                document.body.removeChild(wrapperConfirm)
            }
        })
        // animation
        document.body.appendChild(wrapperConfirm)
        this.attachAnimation(confirmDom)
    },
    attachAnimation: function (confirmDom) {
        // animation
        var scale = 5  // 动画缩放倍数
        var duration = '300ms' // 动画时间
        var timeFunction = 'ease' // 动画函数
        confirmDom.style[this.detectTransition[0]] = this.detectTransform
        confirmDom.style[this.detectTransform] = 'scale(' + 1 / scale + ')'
        confirmDom.style[this.detectTransition[0] + 'TimingFunction'] = timeFunction
        confirmDom.style[this.detectTransition[0] + 'Duration'] = duration
        // 触发重绘, 不然动画没法实现
        confirmDom.getBoundingClientRect()
        confirmDom.style.visibility = 'visible'
        confirmDom.style[this.detectTransform] = 'scale(1) translate(0, -50%)'
    },
    getDom: function (tagName, className, styles) {
        var dom = document.createElement(tagName)
        if (styles && styles.length > 0) {
            this.addCssRule('.' + className + '[notify]', styles)
        }
        dom.className = className
        dom.setAttribute('notify', '')
        return dom
    },
    detectTransition: (function () {
        var t
        var el = document.createElement('surface')
        var transitions = {
            'transition': 'transitionend',
            'OTransition': 'oTransitionEnd',
            'MozTransition': 'transitionend',
            'WebkitTransition': 'webkitTransitionEnd'
        }
        for (t in transitions) {
            if (el.style[t] !== undefined) {
                return [t, transitions[t]]
            }
        }
    })(),
    detectTransform: (function () {
        var t
        var el = document.createElement('surface')
        var transforms = [
            'transform',
            'OTransform',
            'MozTransform',
            'WebkitTransform'
        ]
        for (t in transforms) {
            if (el.style[transforms[t]] !== undefined) {
                return transforms[t]
            }
        }
    })(),
    addCssRule: (function() {
        function createStyleSheet() {
            var head = document.head || document.getElementsByTagName('head')[0];
            var style = document.createElement('style');
            style.type = 'text/css';
            if (!head.contains(sheet)) {
                var before = head.querySelector('style')
                head.insertBefore(style, before)
            }
            return style;
        }
        var sheet = createStyleSheet();
        return function(selector, rules, index) {
            index = index || 0;
            rules = selector + " {" + rules.join(';') + "}"
            if (document.all) {
                if (sheet.styleSheet.cssText.indexOf(rules) === -1) {
                    sheet.styleSheet.cssText += rules
                }
            } else {
                if (sheet.innerHTML.indexOf(rules) === -1) {
                    sheet.innerHTML += rules
                }
            }
            // if (sheet.insertRule) {
            //     sheet.insertRule(selector + "{" + rules + "}", index)
            // } else if (sheet.addRule) {
            //     sheet.addRule(selector, rules, index)
            // }
        }
    })(),
    timeoutId: ''
}
var Notify = {
    // 提醒用户，必须用户手动点确定
    alert: function (msg) {
        util.renderAlert(msg)
    },
    // 只是提示消息，不需要用户反馈
    toast: function (msg, config) {
        util.renderToast(msg, config)
    },
    // 有确认、取消操作
    confirm: function (config) {
        if (Object.prototype.toString.call(config) !== '[object Object]') {
            throw new SyntaxError('argument config error')
        }
        var _config = {
            title: '请确认',
            left: '取消',
            right: '确认',
            class: '',
            modal: false,
            fn: function () {}
        }
        for (var k in _config) {
            if (config[k]) {
                _config[k] = config[k]
            }
        }
        util.renderConfirm(_config)
    }
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Notify
} else {
    window.Notify = Notify
}
