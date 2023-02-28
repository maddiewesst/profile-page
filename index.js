var allData = []
var progressesData = []
var transactionsData = []

var queryData = {query: `
{
  user(where: {id: {_eq: 872}}) {
    login
    id
    progresses(
      where: {_and: [{isDone: {_eq: true}}, {object: {type: {_eq: "project"}}}]}
    ) {
      grade
    }
  }
  transaction(
    where: {_and: [{userId: {_eq: 872}}, {user: {id: {_eq: 872}}}, {object: {type: {_eq: "project"}}}, {type: {_eq: "xp"}}, {amount: {_gt: 4999}}, {amount: {_neq: 14700}}]}
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
    where: {_and: [{userId: {_eq: 872}}, {user: {id: {_eq: 872}}}, {object: {type: {_eq: "project"}}}, {type: {_eq: "xp"}}, {amount: {_gt: 4999}}, {amount: {_neq: 14700}}]}
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
    where: {_and: [{userId: {_eq: 872}}, {type: {_eq: "up"}}]}
    order_by: {createdAt: desc}
  ) {
    amount
  }
  auditRatioDown: transaction(
    where: {_and: [{userId: {_eq: 872}}, {type: {_eq: "down"}}]}
    order_by: {createdAt: desc}
  ) {
    amount
  }
  linegraph: transaction(
    where: {_and: [{userId: {_eq: 872}}, {user: {id: {_eq: 872}}}, {_or: [{object: {type: {_eq: "project"}}}, {object: {type: {_eq: "piscine"}}}]}, {type: {_eq: "xp"}}, {amount: {_gt: 4999}}, {amount: {_neq: 14700}}]}
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

async function postData(url = '', data = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })

    return response.json()
}

let resp = postData('https://learn.01founders.co/api/graphql-engine/v1/graphql', queryData)
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

});

function user(user, transactions) {
  console.log("user", user[0])
  console.log("transactionsuser", transactions)

  //Id
  const id = document.querySelector('#id')
  id.innerText = user[0].id

  //Grade
  var gradeTotal = 0
  var progresses = user[0].progresses
  progresses.forEach(({grade}) => { 
    gradeTotal += grade
  });
  const gradeAvg = Math.round((gradeTotal/progresses.length) * 100) / 100

  const gradeDiv = document.querySelector('#grade');
  gradeDiv.innerText = gradeAvg


  //XP
  const totalXp = getTotalXp(transactions)
  document.querySelector('#xp').innerText = totalXp + ' kB'
}

function getTotalXp(data) {
  let xp = 0
  data.forEach(({amount}) => {
    xp += amount
    console.log('amount: ', amount)
  });
  console.log('xp ', xp)
  var totalXp = Math.round((xp + 800) / 1000)
  return totalXp
}

function projects(data) {

  const projects = document.querySelector('#projects')

  data.forEach(({amount, createdAt, object}) => {
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
    xp.innerText = 'XP: ' + Math.round((amount/1000) * 10) / 10 + 'kB'
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
    down.forEach(({amount}) => {
        totalDown += amount
    });
    console.log("total down", totalDown)

    //done
    var totalUp = 0
    up.forEach(({amount}) => {
        totalUp += amount
    });
    console.log("total up", totalUp)

    const avg = Math.round((totalUp/totalDown) * 10) / 10
    console.log("avg ", avg)

    document.querySelector("#ratio").innerText = avg
    // document.querySelector("#audit-done").innerText = Math.round(totalUp/1000)
    // document.querySelector("#audit-received").innerText = Math.round(totalDown/1000)

    //SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('height', `${100}px`);
    svg.setAttribute('width', `${220}px`);
    // svg.setAttribute('viewBox', `-30 0 500 320`);

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const barUp = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    barUp.setAttribute('width', totalUp/6000);
    barUp.setAttribute('height', 19);
    barUp.setAttribute('y', 20);
    barUp.setAttribute('rx', 3)
    g.appendChild(barUp);  

    var done = document.createTextNode("done");
    const textUp = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textUp.setAttribute('x', totalUp/6000 + 10)
    textUp.setAttribute('y', 30)
    textUp.setAttribute('dy', `${.35}em`)
    textUp.setAttribute('fill', 'rgb(183, 183, 183)')
    textUp.setAttribute('class', 'audit-text')
    textUp.appendChild(done);
    g.appendChild(textUp)

    
    const barDown = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    barDown.setAttribute('width', totalDown/6000);
    barDown.setAttribute('height', 19);
    barDown.setAttribute('y', 60);
    barDown.setAttribute('rx', 3)
    g.appendChild(barDown);
    svg.appendChild(g);

    var received = document.createTextNode("received");
    const textDown = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textDown.setAttribute('x', totalDown/6000 + 10)
    textDown.setAttribute('y', 70)
    textDown.setAttribute('dy', `${.35}em`)
    textDown.setAttribute('fill', 'rgb(183, 183, 183)')
    textDown.setAttribute('class', 'audit-text')
    textDown.appendChild(received);
    g.appendChild(textDown)

    // var ratioNode = document.createTextNode("1");
    // const ratio = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    // ratio.setAttribute('x', 100)
    // ratio.setAttribute('y', 150)
    // ratio.setAttribute('dy', `${.35}em`)
    // ratio.setAttribute('class', 'ratio-text')
    // ratio.appendChild(ratioNode);
    // g.appendChild(ratio)

    svg.appendChild(g);

    document.getElementById('audit-ratio').appendChild(svg);
}

function createLineChart(data) {

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

    data.map(({amount, createdAt}) => {
      xp += amount

      created = (Date.parse(createdAt)-startDate) / 90000000
      console.log("createdat", created)
      let yPos = 300 - xp/2050
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
    // line.setAttribute('stroke', 'rgb(53, 57, 68)')
    line.setAttribute('stroke', 'rgba(227, 195, 231, 1)')
    line.setAttribute('stroke-width', 2);
    line.setAttribute('points', `${points}`);
   
    svg.appendChild(line)

       const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // g.setAttribute('class', 'circles')

    xy.forEach(({x, y, mill, xp}) => {
    const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).format(mill);
    const kB = Math.round((xp/1000) * 10) / 10

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
      text.setAttribute('x', x-50)
      text.setAttribute('y', y -20)
      text.setAttribute('dy', `${.35}em`)
      text.setAttribute('class', 'circle-text')
      text.appendChild(dateNode);
      g.appendChild(text)
  
      var xpNode = document.createTextNode(`+ ${kB} kB`);
      const xpText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      xpText.setAttribute('x', x-50)
      xpText.setAttribute('y', y-10)
      xpText.setAttribute('dy', `${.35}em`)
      xpText.setAttribute('class', 'circle-text')
      xpText.appendChild(xpNode);
      g.appendChild(xpText)


      circle.addEventListener('mouseout', () => {
        // xpText.removeAttribute('y')
        xpText.remove()
        text.remove()

        circle.setAttribute('r', 3)


        // xpText.setAttribute('y')
        // document.querySelectorAll('.circle-text').remove
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

  data.map(({amount, object}) => {

    xy.push({
      x: xCounter,
      y: 170 - (amount/1000),     
      xp: amount,
      name: object.name

    });

    xCounter += 22

  }); 
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  xy.map(({x, y, xp, name}) => {

    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('width', `${19}`);
    bar.setAttribute('height', `${xp/1000}`);
    bar.setAttribute('x', x);
    bar.setAttribute('y', y);
    bar.setAttribute('rx', 3)
    bar.setAttribute('class', 'bar')
    svg.appendChild(bar);   
    xCounter += 22
   
    const kB = Math.round((xp/1000) * 10) / 10
    
    bar.addEventListener('mouseover', () => {

    //    var nameNode = document.createTextNode(name);
    //   const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    //   nameText.setAttribute('x', x - 10)
    //   nameText.setAttribute('y', 170)
    //   nameText.setAttribute('dy', `${.35}em`)
    //   // nameText.setAttribute('fill', 'rgba(255, 255, 255, 1)')
    //   nameText.setAttribute('fill', 'RGB(231, 195, 227)')
    //   nameText.setAttribute('class', 'name-text')
    //   nameText.appendChild(nameNode);
    //   g.appendChild(nameText)

    
    //   var xpNode = document.createTextNode(`${kB} kB`);
    //   const xpText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    //   xpText.setAttribute('x', x - 10)
    //   xpText.setAttribute('y', 185 )
    //   xpText.setAttribute('dy', `${.35}em`)
    //   xpText.setAttribute('class', 'kb-text')
    //   xpText.setAttribute('fill', 'rgba(255, 255, 255, 1)')
    //   xpText.appendChild(xpNode);
    //   g.appendChild(xpText)


      // var nameNode = document.createTextNode(name);
      // const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      // nameText.setAttribute('x', 30)
      // nameText.setAttribute('y', 182)
      // nameText.setAttribute('dy', `${.35}em`)
      // // nameText.setAttribute('fill', 'rgba(255, 255, 255, 1)')
      // nameText.setAttribute('fill', 'RGB(231, 195, 227)')
      // nameText.setAttribute('class', 'circle-text')
      // nameText.appendChild(nameNode);
      // g.appendChild(nameText)

    
      // var xpNode = document.createTextNode(`${kB} kB`);
      // const xpText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      // xpText.setAttribute('x', x)
      // xpText.setAttribute('y', )
      // xpText.setAttribute('dy', `${.35}em`)
      // xpText.setAttribute('class', 'circle-text')
      // xpText.setAttribute('fill', 'rgba(255, 255, 255, 1)')
      // xpText.appendChild(xpNode);
      // g.appendChild(xpText)

      var nameNode = document.createTextNode(name);
      const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      nameText.setAttribute('x', 30)
      nameText.setAttribute('y', 60)
      nameText.setAttribute('dy', `${.35}em`)
      // nameText.setAttribute('fill', 'rgba(255, 255, 255, 1)')
      nameText.setAttribute('fill', 'RGB(231, 195, 227)')
      nameText.setAttribute('class', 'name-text')
      nameText.appendChild(nameNode);
      g.appendChild(nameText)
    
      var xpNode = document.createTextNode(`${kB} kB`);
      const xpText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      xpText.setAttribute('x', 30)
      xpText.setAttribute('y', 80 )
      xpText.setAttribute('dy', `${.35}em`)
      xpText.setAttribute('class', 'kb-text')
      // xpText.setAttribute('stroke', 'RGB(231, 195, 227)')
      xpText.setAttribute('fill', 'RGB(255, 255, 255)')
      xpText.appendChild(xpNode);
      g.appendChild(xpText)
    
      // var kbNode = document.createTextNode('kB');
      // const kbText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      // kbText.setAttribute('x', 60)
      // kbText.setAttribute('y', 80 )
      // kbText.setAttribute('dy', `${.35}em`)
      // kbText.setAttribute('class', 'circle-text')
      // kbText.setAttribute('fill', 'rgba(255, 255, 255, 1)')
      // kbText.appendChild(kbNode);
      // g.appendChild(kbText)

      bar.addEventListener('mouseout', () => {
        nameText.remove()
        xpText.remove()
        // kbText.remove()
        // xpText.remove()
        // name.remove()

      })
    })

  });

 
  // var nameNode = document.createTextNode('make-your-game');
  // const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  // nameText.setAttribute('x', 30)
  // nameText.setAttribute('y', 182)
  // nameText.setAttribute('dy', `${.35}em`)
  // // nameText.setAttribute('fill', 'rgba(255, 255, 255, 1)')
  // nameText.setAttribute('fill', 'RGB(231, 195, 227)')
  // nameText.setAttribute('class', 'circle-text')
  // nameText.appendChild(nameNode);
  // g.appendChild(nameText)

  // var xpNode = document.createTextNode('107 kb');
  // const xpText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  // xpText.setAttribute('x', 30)
  // xpText.setAttribute('y', 80 )
  // xpText.setAttribute('dy', `${.35}em`)
  // xpText.setAttribute('class', 'circle-text')
  // // xpText.setAttribute('stroke', 'RGB(231, 195, 227)')
  // xpText.setAttribute('fill', 'RGB(255, 255, 255)')
  // xpText.appendChild(xpNode);
  // g.appendChild(xpText)

  svg.appendChild(g);
  document.getElementById('bar-chart').appendChild(svg);

}
