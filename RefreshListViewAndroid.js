'use strict';

var React = require('react');
var ReactNative = require('react-native') ;
var Colors = require('./Colors') ;
var isPromise = require('is-promise')
var delay = require('./lib/delay')
var RNScrollView = require('./react-native-refresh-loadmore-scrollview') ;
var {PropTypes,} = React ;
var {
    View,
    Text,
    StyleSheet,
    ListView,
    Dimensions,
    ActivityIndicatorIOS,
} = ReactNative;

/*list status change graph
*
*STATUS_NONE->[STATUS_REFRESH_IDLE, STATUS_INFINITE_IDLE, STATUS_INFINITE_LOADED_ALL]
*STATUS_REFRESH_IDLE->[STATUS_NONE, STATUS_WILL_REFRESH]
*STATUS_WILL_REFRESH->[STATUS_REFRESH_IDLE, STATUS_REFRESHING]
*STATUS_REFRESHING->[STATUS_NONE]
*STATUS_INFINITE_IDLE->[STATUS_NONE, STATUS_WILL_INFINITE]
*STATUS_WILL_INFINITE->[STATUS_INFINITE_IDLE, STATUS_INFINITING]
*STATUS_INFINITING->[STATUS_NONE]
*STATUS_INFINITE_LOADED_ALL->[STATUS_NONE]
*
*/
var
STATUS_NONE = 0,
STATUS_REFRESH_IDLE = 1,
STATUS_WILL_REFRESH = 2,
STATUS_REFRESHING = 3,
STATUS_INFINITE_IDLE = 4,
STATUS_WILL_INFINITE = 5,
STATUS_INFINITING = 6,
STATUS_INFINITE_LOADED_ALL = 7;

var DEFAULT_PULL_DISTANCE = 60;
var DEFAULT_HF_HEIGHT = 50;

var RefreshInfiniteListView = React.createClass({
    propTypes: {
        footerHeight : PropTypes.number,
        pullDistance : PropTypes.number,
        renderEmptyRow : PropTypes.func,
        renderHeaderRefreshIdle : PropTypes.func,
        renderHeaderWillRefresh : PropTypes.func,
        renderHeaderRefreshing : PropTypes.func,
        renderFooterInifiteIdle : PropTypes.func,
        renderFooterWillInifite : PropTypes.func,
        renderFooterInifiting : PropTypes.func,
        renderFooterInifiteLoadedAll : PropTypes.func,
    },
    getDefaultProps () {
        return {
            footerHeight: DEFAULT_HF_HEIGHT,
            pullDistance: DEFAULT_PULL_DISTANCE,
            renderEmptyRow: () => {
                return (
                    <View style={{height:Dimensions.get('window').height*2/3, justifyContent:'center',alignItems:'center'}}>
                        <Text style={{fontSize:40, fontWeight:'800', color:'red'}}>
                        </Text>
                    </View>
                )
            },
            renderHeaderRefreshIdle: () => {return (
                <View style={{flex:1, height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
                    <Text style={styles.text}>
                    </Text>
                </View>
            )},
            renderHeaderWillRefresh: () => {return (
                <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
                    <Text style={styles.text}>
                    </Text>

                </View>
            )},
            renderHeaderRefreshing: () => {return (
                <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
                    <Text style={styles.text}>
                    </Text>

                    <ActivityIndicatorIOS
                        size='small'
                        animating={true}/>
                </View>
            )},
            renderFooterInifiteIdle: () => {return (
                <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
                    <Text style={styles.text}>
                    </Text>
                </View>
            )},
            renderFooterWillInifite: () => {return (
                <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
                    <Text style={styles.text}>
                    </Text>
                </View>
            )},
            renderFooterInifiting: () => {return (
                <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
                    <ActivityIndicatorIOS
                        size='small'
                        animating={true}/>
                    <Text style={styles.text}>
                    </Text>
                </View>
            )},
            renderFooterInifiteLoadedAll: () => { return (
                <View style={{height:DEFAULT_HF_HEIGHT, justifyContent:'center', alignItems:'center'}}>
                    <Text style={styles.text}>
                        已加载完所有数据
                    </Text>
                </View>
            )},
            loadedAllData: () => {
                return false;
            },
            onRefresh: () => {

            },
            onInfinite: () => {

            },
        };
    },
    getInitialState() {
        return {
            status: STATUS_NONE,
        }
    },
    scrollToTop(){
        this.refs.listview.getScrollResponder().scrollResponderScrollTo({x:0,y:0,animated:false}) ;
    },

    renderRow(text) {
        if (this.dataSource) {
            return this.props.renderEmptyRow(text);
        } else {
            return this.props.renderRow(text);
        }
    },
    renderHeader() {
        var status = this.state.status;
        if (status === STATUS_REFRESH_IDLE) {
            return this.props.renderHeaderRefreshIdle();
        }
        if (status === STATUS_WILL_REFRESH) {
            return this.props.renderHeaderWillRefresh();
        }
        if (status === STATUS_REFRESHING) {
            return this.props.renderHeaderRefreshing();
        }
        return null;
    },
    renderFooter() {
        var status = this.state.status;
        this.footerIsRender = true;
        if (status === STATUS_INFINITE_IDLE) {
            return this.props.renderFooterInifiteIdle();
        }
        if (status === STATUS_WILL_INFINITE) {
            return this.props.renderFooterWillInifite();
        }
        if (status === STATUS_INFINITING) {
            return this.props.renderFooterInifiting();
        }
        if (status === STATUS_INFINITE_LOADED_ALL) {
            return this.props.renderFooterInifiteLoadedAll();
        }
        this.footerIsRender = false;
        return null;
    },
    handleResponderGrant(event) {
        var nativeEvent = event.nativeEvent;
        if (!nativeEvent.contentInset || this.state.status!==STATUS_NONE) {
            return;
        }
        var y0 = nativeEvent.contentInset.top + nativeEvent.contentOffset.y;
        if (y0 < 0) {
            this.setState({status:STATUS_REFRESH_IDLE});
            return;
        }
        y0 = nativeEvent.contentInset.top + nativeEvent.contentOffset.y +
        nativeEvent.layoutMeasurement.height-nativeEvent.contentSize.height;
        if (y0 > 0 ) {
            if (!this.props.haveend) {
                this.initialInfiniteOffset = (y0>0?y0:0);
                this.setState({status:STATUS_INFINITE_IDLE});
            } else {
                this.setState({status:STATUS_INFINITE_LOADED_ALL});
            }
        }
    },
    hideHeader() {
        this.setState({status:STATUS_NONE});
    },
    hideFooter() {
        this.setState({status:STATUS_NONE});
    },
    handleResponderRelease(event) {
        var status = this.state.status;
        if (status === STATUS_REFRESH_IDLE) {
            this.setState({status:STATUS_NONE});
        } else if (status === STATUS_WILL_REFRESH) {
            this.setState({status:STATUS_REFRESHING});
            this.props.onRefresh(true);
        } else if (status === STATUS_INFINITE_IDLE) {
            this.setState({status:STATUS_NONE});
        } else if (status === STATUS_WILL_INFINITE) {
            this.setState({status:STATUS_INFINITING});
            this.props.onInfinite(false);
        } else if (status === STATUS_INFINITE_LOADED_ALL) {
            this.setState({status:STATUS_NONE});
        }
    },
    handleScroll(event) {
        var nativeEvent = event.nativeEvent;
        var status = this.state.status;
        if (status===STATUS_REFRESH_IDLE || status===STATUS_WILL_REFRESH) {
            var y = nativeEvent.contentInset.top + nativeEvent.contentOffset.y
            if (status!==STATUS_WILL_REFRESH && y<-this.props.pullDistance) {
                this.setState({status:STATUS_WILL_REFRESH});
            } else if (status===STATUS_WILL_REFRESH && y>=-this.props.pullDistance) {
                this.setState({status:STATUS_REFRESH_IDLE});
            }
            return;
        }

        if (status===STATUS_INFINITE_IDLE || status===STATUS_WILL_INFINITE) {
            var y = nativeEvent.contentInset.top + nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height
            -nativeEvent.contentSize.height-this.initialInfiniteOffset;
            if (this.footerIsRender) {
                y += this.props.footerHeight;
            }
            if (status!==STATUS_WILL_INFINITE && y>this.props.pullDistance) {
                this.setState({status:STATUS_WILL_INFINITE});
            } else if (status===STATUS_WILL_INFINITE && y<=this.props.pullDistance) {
                this.setState({status:STATUS_INFINITE_IDLE});
            }
        }
    },





    _onReload(refresh){

        var loadingDataPromise = new Promise((resolve) => {

            var loadDataReturnValue;

            if(refresh){
                this.scrollToTop();
                loadDataReturnValue= this.props.onRefresh&&this.props.onRefresh(true);
            }else{
                loadDataReturnValue=this.props.onInfinite&&this.props.onInfinite(false) ;
            }


            if (isPromise(loadDataReturnValue)) {
                loadingDataPromise = loadDataReturnValue
            }

            Promise.all([
                loadingDataPromise,
                new Promise((resolve) => this.setState({}, resolve)),

            ]).then(() => {
                   this.onLoadComplete();
                   this.setState({status:STATUS_NONE});
                })
        })

    },

    _onRefresh(){
        this._onReload(true);
    },
    _onLoadMore(){
        this._onReload(false);
    },

    onLoadComplete(){
        this.refs.scrollview.loadComplete() ;
    },

    render() {
        this.dataSource = null;
        if (!this.props.dataSource.getRowCount()) {
            var DataSource = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
            this.dataSource = DataSource.cloneWithRows([""]);

        }
        return (
            <RNScrollView ref='scrollview' style={{flex:1}} onLoadMore={this._onLoadMore} onRefresh={this._onRefresh}
                          progressBackgroundColor={Colors.main_theme_color}>
            <ListView
                {...this.props}
                ref='listview'
                dataSource={this.dataSource?this.dataSource:this.props.dataSource}
                renderRow={this.renderRow}
                renderHeader={this.renderHeader}
                renderFooter={this.renderFooter}
                onResponderGrant={this.handleResponderGrant}
                onResponderRelease={this.handleResponderRelease}
                onScroll={this.handleScroll}
                />
                </RNScrollView>
        )
    }
});

var styles = StyleSheet.create({
    text: {
        fontSize:14,
        color:Colors.order.search_text_color,
    },
    image: {
        width:40,
        height:32,
    },
    imageRotate: {
        transform:[{rotateX: '180deg'},],
    },
});

module.exports = RefreshInfiniteListView;
