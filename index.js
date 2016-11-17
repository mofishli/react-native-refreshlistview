/**
 * Created by dali6 on 16/4/6.
 */



var ReactNative = require('react-native');
var React = require('react') ;
var RefreshableListViewIOS=require('./RefreshListViewIOS');


var {
    Platform,
}= ReactNative;

var RefreshListView = React.createClass({



    render() {
        if(Platform.OS === 'ios'){
            return (
                <RefreshableListViewIOS
                    {...this.props}
                />
            )
        }else {

            var RefreshListViewAndroid=require('./RefreshListViewAndroid');

            return (
                <RefreshListViewAndroid
                    ref="android"
                    haveend={this.props.haveend}
                    dataSource={this.props.dataSource}
                    renderRow={this.props.renderRow}
                    onRefresh={this.props.loadData}
                    onInfinite={this.props.loadData}
                />
            )
        }


    },

    scrollToTop(){
        if(Platform.OS !== 'ios') {
            this.refs.android.scrollToTop();
        }
    }

})

module.exports = RefreshListView