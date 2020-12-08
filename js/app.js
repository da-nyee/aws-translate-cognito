var albumBucketName = 'bucket-for-photo-album-service';
var bucketRegion = 'us-east-1';
var IdentityPoolId = 'us-east-1:09be1c3a-b61e-4d9f-99f7-b944ba70cf83';

AWS.config.update({
  region: bucketRegion,
  credentials: new AWS.CognitoIdentityCredentials({
    IdentityPoolId: IdentityPoolId
  })
});

var s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  params: {
    Bucket: albumBucketName
  }
});

function listAlbums() {
  s3.listObjects({
    Delimiter: '/'
  }, function (err, data) {
    if (err) {
      return alert('앨범 목록 확인에 오류가 발생했습니다. ' + err.message);
    } else {
      console.log('앨범', data.CommonPrefixes)
      var albums = data.CommonPrefixes.map(function (commonPrefix) {
        var prefix = commonPrefix.Prefix;
        var albumName = decodeURIComponent(prefix.replace('/', ''));
        return getHtml([
          '<li>',
          '<span onclick="deleteAlbum(\'' + albumName + '\')">❌</span>',
          '<span onclick="viewAlbum(\'' + albumName + '\')">',
          albumName,
          '</span>',
          '</li>'
        ]);
      });
      var message = albums.length ?
        getHtml([
          '<p><b>앨범 이름</b>을 클릭해서 <b>앨범 내용을 확인</b>할 수 있습니다.<br/><b>새 앨범 생성하기</b>를 클릭해서 <b>앨범을 생성</b>할 수 있습니다.<br/>❌를 클릭해서 <b>앨범을 삭제</b>할 수 있습니다.</p>',
        ]) :
        '<p>새 앨범을 생성해주세요!</p>';
      var htmlTemplate = [
        '<br/>',
        message,
        '<br/>',
        '<h2>앨범 목록</h2>',
        '<br/>',
        '<ul>',
        getHtml(albums),
        '</ul>',
        '<br/>',
        '<button onclick="createAlbum(prompt(\'앨범 이름을 입력해주세요!\'))" class="button button-contactForm">',
        '새 앨범 생성하기',
        '</button>'
      ]
      document.getElementById('app').innerHTML = getHtml(htmlTemplate);
    }
  });
}

function createAlbum(albumName) {
  albumName = albumName.trim();
  if (!albumName) {
    return alert('앨범 이름은 1자 이상 입력해주세요!');
  }
  if (albumName.indexOf('/') !== -1) {
    return alert('앨범 이름은 "/"를 제외하고 입력해주세요!');
  }
  var albumKey = encodeURIComponent(albumName) + '/';
  s3.headObject({
    Key: albumKey
  }, function (err, data) {
    if (!err) {
      return alert('앨범 이름은 중복되지 않게 입력해주세요!');
    }
    if (err.code !== 'NotFound') {
      return alert('새 앨범 생성에 오류가 발생했습니다. ' + err.message);
    }
    s3.putObject({
      Key: albumKey
    }, function (err, data) {
      if (err) {
        return alert('새 앨범 생성에 오류가 발생했습니다. ' + err.message);
      }
      alert('새 앨범 생성이 완료되었습니다!');
      viewAlbum(albumName);
    });
  });
}

function viewAlbum(albumName) {
  var albumPhotosKey = encodeURIComponent(albumName) + '//';
  s3.listObjects({
    Prefix: albumPhotosKey
  }, function (err, data) {
    if (err) {
      return alert('앨범 내용 확인에 오류가 발생했습니다. ' + err.message);
    }
    // 'this' references the AWS.Response instance that represents the response
    var href = this.request.httpRequest.endpoint.href;
    var bucketUrl = href + albumBucketName + '/';
    console.log('앨범', data.Contents)

    var photos = data.Contents.map(function (photo) {
      var photoKey = photo.Key;
      var photoUrl = bucketUrl + encodeURIComponent(photoKey);
      return getHtml([
        '<span>',
        '<div>',
        '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
        '</div>',
        '<div>',
        '<span onclick="deletePhoto(\'' + albumName + "','" + photoKey + '\')">',
        '❌',
        '</span>',
        '<span>',
        photoKey.replace(albumPhotosKey, ''),
        '</span>',
        '</div>',
        '</span>',
      ]);
    });
    var message = photos.length ?
      '<p>❌를 클릭해서 <b>사진을 삭제</b>할 수 있습니다.</p>' :
      '<p>사진을 업로드해주세요!</p>';
    var htmlTemplate = [
      '<br/>',
      '<h2><b>',
      albumName,
      '</b></h2>',
      '<br/>',
      message,
      '<br/>',
      '<div>',
      getHtml(photos),
      '</div>',
      '<br/>',
      '<input id="photoupload" type="file" accept="image/*">',
      '<br/><br/>',
      '<button id="addphoto" onclick="addPhoto(\'' + albumName + '\')" class="button button-contactForm">',
      '사진 업로드하기',
      '</button>',
      '<button onclick="listAlbums()" class="button button-contactForm">',
      '앨범 목록으로 돌아가기',
      '</button>',
    ]
    document.getElementById('app').innerHTML = getHtml(htmlTemplate);
  });
}

function addPhoto(albumName) {
  var files = document.getElementById('photoupload').files;
  if (!files.length) {
    return alert('사진을 먼저 선택해주세요!');
  }
  var file = files[0];
  var fileName = file.name;
  var albumPhotosKey = encodeURIComponent(albumName) + '//';

  var photoKey = albumPhotosKey + fileName;
  s3.upload({
    Key: photoKey,
    Body: file,
    ACL: 'public-read'
  }, function (err, data) {
    if (err) {
      console.log(err)
      return alert('사진 업로드에 오류가 발생했습니다. ', err.message);
    }
    alert('사진 업로드가 완료되었습니다!');
    viewAlbum(albumName);
  });
}

function deletePhoto(albumName, photoKey) {
  s3.deleteObject({
    Key: photoKey
  }, function (err, data) {
    if (err) {
      return alert('사진 삭제에 오류가 발생했습니다. ', err.message);
    }
    alert('사진 삭제가 완료되었습니다!');
    viewAlbum(albumName);
  });
}

function deleteAlbum(albumName) {
  var albumKey = encodeURIComponent(albumName) + '/';
  s3.listObjects({
    Prefix: albumKey
  }, function (err, data) {
    if (err) {
      return alert('앨범 삭제에 오류가 발생했습니다. ', err.message);
    }
    var objects = data.Contents.map(function (object) {
      return {
        Key: object.Key
      };
    });
    s3.deleteObjects({
      Delete: {
        Objects: objects,
        Quiet: true
      }
    }, function (err, data) {
      if (err) {
        return alert('앨범 삭제에 오류가 발생했습니다. ', err.message);
      }
      alert('앨범 삭제가 완료되었습니다!');
      listAlbums();
    });
  });
}