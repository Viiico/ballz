//setup
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
ctx.strokeStyle = 'white';
const maxVelocity = 15.0;
const subStep = 10;
const gridWidth = 50;
const gridHeight = 30;
const radius = 10;
const elasticity = 0.1;
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;

document.addEventListener("mousedown", () => isMouseDown = true);
document.addEventListener("mouseup", () => isMouseDown = false);
document.addEventListener("mousemove", ({clientX, clientY}) => {
    mouseX = clientX;
    mouseY = clientY;
});

class Vector{
    constructor(x, y){
        this.x = x;
        this.y = y;
    }
    add(v){
        return new Vector(this.x + v.x, this.y + v.y);
    }
    sub(v){
        return new Vector(this.x - v.x, this.y - v.y);
    }
    mag(){
        return Math.sqrt(this.x**2 + this.y**2);
    }
    mult(num){
        return new Vector(this.x*num, this.y*num);
    }
    div(num){
        return new Vector(this.x/num, this.y/num)
    }
    unit(){
        if(this.mag() === 0)return new Vector(0,0);
        return new Vector(this.x/this.mag(), this.y/this.mag());
    }
    norm(){
        return new Vector(-this.y, this.x).unit();
    }

    static dot(v1, v2){
        return v1.x*v2.x + v1.y*v2.y;
    }
}

class Particle {
    constructor(effect, pos, vel, color){
        this.effect = effect;
        this.radius = radius;
        this.color = color || 'red';
        if(pos == undefined){
            const x = this.radius + Math.random() * (this.effect.width - this.radius * 2);
            const y = this.radius + Math.random() * (this.effect.height - this.radius * 2);
            this.pos = new Vector(x, y);
        }else this.pos = pos;
        // if(vel == undefined)this.vel = new Vector(Math.random() * 20 - 10, Math.random() * 20 - 10);
        if(vel == undefined)this.vel = new Vector(0, 0);
        else this.vel = vel;
        this.acc = new Vector(0, 0);
    }
    draw(ctx){
        ctx.fillStyle = `rgb(${(this.vel.mag() * 255 / 10)}, 0, 0)`;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    update(grid){
        this.pos.x += this.vel.x / subStep;
        this.pos.y += this.vel.y / subStep;
        this.vel.x += this.acc.x / subStep;
        this.vel.y += this.acc.y / subStep;
        if(this.pos.x > this.effect.width - this.radius){
            this.pos.x = this.effect.width - this.radius;
            this.vel.x *= -.5;
        }
        if(this.pos.x < this.radius){
            this.pos.x = this.radius;
            this.vel.x *= -.5;
        }
        if(this.pos.y > this.effect.height - this.radius){
            this.pos.y = this.effect.height - this.radius;
            this.vel.y *= -.35;
        }
        if(this.pos.y < this.radius){
            this.pos.y = this.radius;
            this.vel.y *= -1;
        }
        grid.applyPull(this);
        grid.addParticle(this);
    }
}

class Grid {
    constructor(effect){
        this.effect = effect;
        this.clear();
    }
    addParticle(particle){
        const xCell = Math.floor(particle.pos.x/this.effect.width*gridWidth);
        const yCell = Math.floor(particle.pos.y/this.effect.height*gridHeight);
        this.grid[xCell][yCell].push(particle);
    }
    findCollisionsGrid(){
        for(let x=0; x<gridWidth; x++){
            for(let y=0; y<gridHeight; y++){
                const currentCell = this.grid[x][y];
                if(currentCell.length==0)continue;
                for(let dx = -1; dx <=1; ++dx){
                    for(let dy=-1; dy<=1; ++dy){
                        if(x+dx<0||x+dx>=gridWidth)continue;
                        if(y+dy<0||y+dy>=gridHeight)continue;
                        const otherCell = this.grid[x+dx][y+dy];
                        this.checkCellsCollision(currentCell, otherCell);
                    }
                }
            }
        }
    }
    checkCellsCollision(currentCell, otherCell){
        for(const cellIdx1 in currentCell){
            for(const cellIdx2 in otherCell){
                if(cellIdx1 === cellIdx2 && currentCell == otherCell)continue;
                if(this.areColliding(currentCell[cellIdx1], otherCell[cellIdx2])){
                    this.penetrationResolution(currentCell[cellIdx1], otherCell[cellIdx2]);
                    this.resolveCollision(currentCell[cellIdx1], otherCell[cellIdx2]);
                }
            }
        }
    }
    applyPull(ball){
        if(isMouseDown === false)return;
        const mousePos = new Vector(mouseX, mouseY);
        const displacement = mousePos.sub(ball.pos);
        const dist = displacement.mag();
        const forceDirection = displacement.unit();
        const pullingForce = forceDirection.mult(6.674 * 10**3 / dist**2).div(subStep);
        ball.vel = ball.vel.add(pullingForce);
        if(ball.vel.mag() > maxVelocity)ball.vel = ball.vel.unit().mult(maxVelocity);
    }
    areColliding(ball1, ball2){
        const dist = ball1.pos.sub(ball2.pos).mag()
        return ball1.radius + ball2.radius >= dist;
    }
    penetrationResolution(ball1, ball2){
        const dist = ball1.pos.sub(ball2.pos);
        const penDepth = ball1.radius + ball2.radius - dist.mag();
        const penRes = dist.unit().mult(penDepth/2);
        ball1.pos = ball1.pos.add(penRes);
        ball2.pos = ball2.pos.add(penRes.mult(-1));
    }
    resolveCollision(ball1, ball2){
        const normal = ball1.pos.sub(ball2.pos).unit();
        const relVel = ball1.vel.sub(ball2.vel);
        const sepVel = Vector.dot(relVel, normal);
        if(sepVel>0)return;
        const newSepVel = -sepVel * elasticity;
        const sepVelVec = normal.mult(newSepVel);

        ball1.vel = ball1.vel.add(sepVelVec);
        ball2.vel = ball2.vel.add(sepVelVec.mult(-1));
    }
    clear(){
        this.grid = Array(gridWidth).fill(0).map(() => Array(gridHeight).fill(0).map(()=>[]));
    }
}

class Effect {
    constructor(canvas){
        this.canvas = canvas;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.particles = [];
        this.numberOfParticles = 1000;
        this.createParticles();
        this.grid = new Grid(this);
    }
    createParticles(){
        for(let i = 0; i< this.numberOfParticles; i++){
            this.particles.push(new Particle(this));
        }
    }
    async addBalls(amount, delay, pos, vel, color){
        for(let i=0; i<amount; i++){
            this.particles.push(new Particle(this, new Vector(pos.x, pos.y), new Vector(vel.vx, vel.vy), color));
            await sleep(delay);
        }
    }
    drawParticles(ctx){
        this.particles.forEach(particle => {
            particle.draw(ctx);
        })
    }
    handleParticles(){
        this.grid.clear();
        this.particles.forEach(particle => {
            particle.update(this.grid);
        });
        this.grid.findCollisionsGrid();
    }
    drawGrid(ctx){
        for(let x = 0; x<this.width; x += this.width/gridWidth){
            for(let y = 0; y<this.height; y += this.height/gridHeight){
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + this.width/gridWidth, y);
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + this.height/gridHeight);
                ctx.stroke();
            }
        }
    }
}

const effect = new Effect(canvas);

function animate(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(animate);
    effect.drawParticles(ctx);
    for(let i=0; i<subStep; i++){
        effect.handleParticles();
    }
    // effect.drawGrid(ctx);
}
(async function(){
    animate();
})();

function sleep (milliseconds){
    return new Promise(resolve => setTimeout(resolve, milliseconds))
  }