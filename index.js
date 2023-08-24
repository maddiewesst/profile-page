import { Buffer } from "buffer"

var transactionsData = []

var username
var password


var queryData = {
  query: `
  query GetUser($userId: Int!) {
  user(where: {id: {_eq: $userId}}) {
    login
    id
    progresses(
      where: {_and: [{isDone: {_eq: true}}, {object: {type: {_eq: "project"}}}]}
    ) {
      grade
    }
  }
  transaction(
    where: {_and: [{userId: {_eq: $userId}}, {user: {id: {_eq: $userId}}}, {object: {type: {_eq: "project"}}}, {type: {_eq: "xp"}}, {amount: {_gt: 4999}}, {amount: {_neq: 14700}}]}
    order_by: {createdAt: asc}
  ) {
    amount
    createdAt
    type
    object {
      name
    }
  }
  projects: transaction(
    where: {_and: [{userId: {_eq: $userId}}, {user: {id: {_eq: $userId}}}, {object: {type: {_eq: "project"}}}, {type: {_eq: "xp"}}, {amount: {_gt: 4999}}, {amount: {_neq: 14700}}]}
    order_by: {createdAt: desc}
  ) {
    amount
    createdAt
    type
    object {
      name
    }
  }
  auditRatioUp: transaction(
    where: {_and: [{userId: {_eq: $userId}}, {type: {_eq: "up"}}]}
    order_by: {createdAt: desc}
  ) {
    amount
  }
  auditRatioDown: transaction(
    where: {_and: [{userId: {_eq: $userId}}, {type: {_eq: "down"}}]}
    order_by: {createdAt: desc}
  ) {
    amount
  }
  linegraph: transaction(
    where: {_and: [{userId: {_eq: $userId}}, {user: {id: {_eq: $userId}}}, {_or: [{object: {type: {_eq: "project"}}}, {object: {type: {_eq: "piscine"}}}]}, {type: {_eq: "xp"}}, {amount: {_gt: 4999}}, {amount: {_neq: 14700}}]}
    order_by: {createdAt: asc}
  ) {
    amount
    createdAt
    type
    object {
      name
      type
    }
  }
}

`}

//Sign in

document.querySelector('.signin-btn').addEventListener("click", function () {

  username = document.querySelector('#signin-username').value
  password = document.querySelector('#signin-password').value


  document.querySelector('#username').innerText = username

  document.querySelector('.signin-container').style.display = "none"
  document.querySelector('.container').style.display = "flex"

  document.querySelector('#signin-username').value = ""
  document.querySelector('#signin-password').value = ""


  let resp = postData('https://learn.01founders.co/api/graphql-engine/v1/graphql', queryData.query)
  resp.then((result) => {

    console.log("result", result)
    var username = result.data.user[0].login
    console.log(username)

    var transactions = result.data.transaction

    for (var i = 0; i < transactions.length; i++) {
      transactionsData.push({
        amount: transactions[i].amount,
        createdAt: transactions[i].createdAt,
        object: {
          name: transactions[i].object.name
        }
      })
    }
    console.log("all transactions", transactionsData)

    user(result.data.user, result.data.linegraph)
    projects(result.data.projects)
    auditRatio(result.data.auditRatioDown, result.data.auditRatioUp)
    createBarChart(transactions)
    createLineChart(result.data.linegraph)

      .catch((error) => console.log('error', error));
  });

})

//Auth

const getAuth = async () => {
  const authHeader = Buffer.from(`${username}:${password}`).toString(
    'base64'
  );


  const myHeaders = new Headers();
  myHeaders.append('Authorization', 'Basic ' + authHeader);
  console.log("authhh", authHeader)
  const requestOptions = {
    method: 'POST',
    headers: myHeaders,
    redirect: 'follow',
  };

  return fetch(`https://learn.01founders.co/api/auth/signin`, requestOptions)
    .then((response) => response.json())
    .then((result) => result)
    .catch((error) => console.log('error', error));
};


async function getUserId(token) {
  // Split the token into header, payload, and signature parts
  const [headerBase64, payloadBase64, signatureBase64] = token.split('.');

  // Decode the payload (claims)
  const payload = JSON.parse(atob(payloadBase64));

  return payload.sub;
}

async function postData(url = '', query = {}) {
  const token = await getAuth();
  const userId = await getUserId(token);

  const variables = {
    userId: userId,
  }

  const authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({query, 
    variables: variables  })
  })

  return response.json()
} 



function user(user, transactions) {
  console.log("user", user[0])
  console.log("transactionsuser", transactions)

  //Id
  const id = document.querySelector('#id')
  id.innerText = user[0].id

  //Grade
  var gradeTotal = 0
  var progresses = user[0].progresses
  progresses.forEach(({ grade }) => {
    gradeTotal += grade
  });
  const gradeAvg = Math.round((gradeTotal / progresses.length) * 100) / 100

  const gradeDiv = document.querySelector('#grade');
  gradeDiv.innerText = gradeAvg


  //XP
  const totalXp = getTotalXp(transactions)
  document.querySelector('#xp').innerText = totalXp + ' kB'
}

function getTotalXp(data) {
  let xp = 0
  data.forEach(({ amount }) => {
    xp += amount
    console.log('amount: ', amount)
  });
  console.log('xp ', xp)
  var totalXp = Math.round((xp + 800) / 1000)
  return totalXp
}

function projects(data) {

  const projects = document.querySelector('#projects')

  data.forEach(({ amount, createdAt, object }) => {
    var mill = Date.parse(createdAt)
    const created = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).format(mill);

    const container = document.createElement('div');
    container.className = 'project-container';
    projects.appendChild(container);
    const name = document.createElement('div');
    name.className = 'project-name';
    name.innerText = object.name;
    container.appendChild(name);
    const xp = document.createElement('div');
    xp.className = 'project-xp';
    xp.innerText = 'XP: ' + Math.round((amount / 1000) * 10) / 10 + 'kB'
    container.appendChild(xp);
    const date = document.createElement('div');
    date.className = 'project-date';
    date.innerText = 'created: ' + created
    container.appendChild(date);

  });


}

function auditRatio(down, up) {
  console.log("down", down)

  //received
  var totalDown = 0
  down.forEach(({ amount }) => {
    totalDown += amount
  });
  console.log("total down", totalDown)

  //done
  var totalUp = 0
  up.forEach(({ amount }) => {
    totalUp += amount
  });
  console.log("total up", totalUp / 12000)

  let avg = Math.round((totalUp / totalDown) * 10) / 10
  console.log("avg ", avg)
  document.querySelector("#ratio").innerText = avg

  //SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('height', `${100}px`);
  svg.setAttribute('width', `${220}px`);
  // svg.setAttribute('viewBox', `-30 0 500 320`);

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const barUp = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  barUp.setAttribute('width', totalUp / 12000);
  barUp.setAttribute('height', 19);
  barUp.setAttribute('y', 20);
  barUp.setAttribute('rx', 3)
  g.appendChild(barUp);

  var done = document.createTextNode("done");
  const textUp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textUp.setAttribute('x', totalUp / 12000 + 10)
  textUp.setAttribute('y', 30)
  textUp.setAttribute('dy', `${.35}em`)
  textUp.setAttribute('fill', 'rgb(183, 183, 183)')
  textUp.setAttribute('class', 'audit-text')
  textUp.appendChild(done);
  g.appendChild(textUp)


  const barDown = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  barDown.setAttribute('width', totalDown / 12000);
  barDown.setAttribute('height', 19);
  barDown.setAttribute('y', 60);
  barDown.setAttribute('rx', 3)
  g.appendChild(barDown);
  svg.appendChild(g);

  var received = document.createTextNode("received");
  const textDown = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  textDown.setAttribute('x', totalDown / 12000 + 10)
  textDown.setAttribute('y', 70)
  textDown.setAttribute('dy', `${.35}em`)
  textDown.setAttribute('fill', 'rgb(183, 183, 183)')
  textDown.setAttribute('class', 'audit-text')
  textDown.appendChild(received);
  g.appendChild(textDown)

  svg.appendChild(g);

  document.getElementById('audit-ratio').appendChild(svg);
}

function createLineChart(data) {
  console.log("length", data.length)

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('height', `${280}px`);
  svg.setAttribute('width', `${500}px`);
  svg.setAttribute('viewBox', `-30 15 500 320`);

  const startDate = Date.parse('11 Oct 2021 00:12:00 GMT')


  console.log("startdate", startDate);
  var xp = 0

  var points = [0, 300]
  let created = []
  var xy = []

  data.map(({ amount, createdAt }) => {
    xp += amount


    // Calculate scaling factors based on the number of data points
    const scaleFactorX = 2200000 / data.length * 1000;
    const scaleFactorY = 80000 / data.length;


    created = (Date.parse(createdAt) - startDate) / scaleFactorX
    console.log("createdat", created)
    let yPos = 300 - xp / scaleFactorY
    points.push(created, yPos)
    xy.push({
      x: created,
      y: yPos,
      mill: (Date.parse(createdAt)),
      xp: amount
    });

  });



  console.log("points", points)
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'rgba(227, 195, 231, 1)')
  line.setAttribute('stroke-width', 2);
  line.setAttribute('points', `${points}`);

  svg.appendChild(line)

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  xy.forEach(({ x, y, mill, xp }) => {
    const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).format(mill);
    const kB = Math.round((xp / 1000) * 10) / 10

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x)
    circle.setAttribute('cy', y)
    circle.setAttribute('r', 3)
    // circle.setAttribute('data-value', 6)
    g.appendChild(circle);



    circle.addEventListener('mouseover', () => {

      circle.setAttribute('r', 5)

      var dateNode = document.createTextNode(date);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x - 50)
      text.setAttribute('y', y - 20)
      text.setAttribute('dy', `${.35}em`)
      text.setAttribute('class', 'circle-text')
      text.appendChild(dateNode);
      g.appendChild(text)

      var xpNode = document.createTextNode(`+ ${kB} kB`);
      const xpText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      xpText.setAttribute('x', x - 50)
      xpText.setAttribute('y', y - 10)
      xpText.setAttribute('dy', `${.35}em`)
      xpText.setAttribute('class', 'circle-text')
      xpText.appendChild(xpNode);
      g.appendChild(xpText)


      circle.addEventListener('mouseout', () => {
        xpText.remove()
        text.remove()

        circle.setAttribute('r', 3)

      })
    })
  });
  const currXp = getTotalXp(data)
  var totalNode = document.createTextNode('Total');
  const total = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  total.setAttribute('x', 465)
  total.setAttribute('y', 20)
  total.setAttribute('dy', `${.35}em`)
  total.setAttribute('class', 'circle-text')
  total.appendChild(totalNode);
  g.appendChild(total)
  var totalNode = document.createTextNode(currXp + ' kB');
  const totalXp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  totalXp.setAttribute('x', 465)
  totalXp.setAttribute('y', 30)
  totalXp.setAttribute('dy', `${.35}em`)
  totalXp.setAttribute('class', 'circle-text')
  totalXp.appendChild(totalNode);
  g.appendChild(totalXp)

  var startNode = document.createTextNode("Oct '21");
  const start = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  start.setAttribute('x', -17)
  start.setAttribute('y', 312)
  start.setAttribute('dy', `${.35}em`)
  start.setAttribute('class', 'circle-text')
  start.appendChild(startNode);
  g.appendChild(start)

  svg.appendChild(g);

  document.getElementById('line-chart').appendChild(svg);

}


function createBarChart(data) {

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('height', `${200}px`);
  svg.setAttribute('width', `${420}px`);
  svg.setAttribute('viewBox', `-15 0 420 200`);
  console.log("data", data)

  var xCounter = 30
  var xy = []

  data.map(({ amount, object }) => {

    xy.push({
      x: xCounter,
      y: 190 - (amount / 2700),
      xp: amount,
      name: object.name

    });

    xCounter += 22

  });
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  xy.map(({ x, y, xp, name }) => {

    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('width', `${19}`);
    bar.setAttribute('height', `${xp / 2700}`);
    bar.setAttribute('x', x);
    bar.setAttribute('y', y);
    bar.setAttribute('rx', 3)
    bar.setAttribute('class', 'bar')
    svg.appendChild(bar);
    xCounter += 22

    const kB = Math.round((xp / 1000) * 10) / 10

    bar.addEventListener('mouseover', () => {

      var nameNode = document.createTextNode(name);
      const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      nameText.setAttribute('x', 30)
      nameText.setAttribute('y', 60)
      nameText.setAttribute('dy', `${.35}em`)
      nameText.setAttribute('fill', 'RGB(231, 195, 227)')
      nameText.setAttribute('class', 'name-text')
      nameText.appendChild(nameNode);
      g.appendChild(nameText)

      var xpNode = document.createTextNode(`${kB} kB`);
      const xpText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      xpText.setAttribute('x', 30)
      xpText.setAttribute('y', 80)
      xpText.setAttribute('dy', `${.35}em`)
      xpText.setAttribute('class', 'kb-text')
      xpText.setAttribute('fill', 'RGB(255, 255, 255)')
      xpText.appendChild(xpNode);
      g.appendChild(xpText)

      bar.addEventListener('mouseout', () => {
        nameText.remove()
        xpText.remove()
      })
    })

  });

  svg.appendChild(g);
  document.getElementById('bar-chart').appendChild(svg);

}

//Log out
document.querySelector(".logout-btn").addEventListener("click", function () {

  document.querySelector('.signin-container').style.display = "flex"
  document.querySelector('.container').style.display = "none"

})