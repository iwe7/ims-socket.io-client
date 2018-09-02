### @types/socket.io-client 版本过低
> 用typescript重写,并增加实用功能

## socket.io-client
```ts
import { connect } from 'ims-socket.io-client';
const socket = connect('http://localhost:3000',{});
socket.onconnect = ()=> {
    socket.send('some data');
};
socket.on('message',(data)=>{
    console.log(data);
})
```
## rxjs封装
```ts
import { SocketSubject } from 'ims-socket.io-client';
const socket = new SocketSubject('http://localhost:3000',{});

// 订阅时创建连接
socket.subscribe(res=>{
    console.log('接受到的消息',res);
});
// 发送消息 等同于 socket.send(data);
socket.next(data);
// 取消订阅时关闭连接 socket.close();
socket.unsubject(');
```
