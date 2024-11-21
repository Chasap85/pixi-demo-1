import * as Matter from 'matter-js';
import * as PIXI from "pixi.js";
import gsap from 'gsap';
import { App } from '../system/App';

export class Hero {
    constructor() {
        this.createSprite();
        this.createBody();
        App.app.ticker.add(this.update, this);
        this.dy = App.config.hero.jumpSpeed;
        this.maxJumps = App.config.hero.maxJumps;
        this.jumpIndex = 0;
        this.score = 0
        // keep track of each diamond and corresponding animation instance
        this.attractedDiamonds = new Map(); 
    }

    collectDiamond(diamond) {
        ++this.score;
        //[13]
        if (this.attractedDiamonds.has(diamond)) {
            const tween = this.attractedDiamonds.get(diamond);
            if (tween) {
                tween.kill();
            }
            this.attractedDiamonds.delete(diamond);
        }
        this.sprite.emit("score");
        //[/13]
        diamond.destroy();
    }
    //[/12]

    activatePowerUp(powerUp) {
        powerUp.destroy();
        if (this.powerupActive) return;

        this.powerupActive = true;

        this.powerField = new PIXI.Graphics();
        this.powerField.beginFill(0x4287f5, 0.2);
        this.powerField.drawCircle(0, 0, 300);
        this.powerField.endFill();
        this.sprite.addChild(this.powerField);

        this.powerField.alpha = 0;
        gsap.to(this.powerField, {
            alpha: 1,
            duration: 0.5,
            yoyo: true,
            repeat: -1
        });

        setTimeout(() => this.deactivatePowerup(), App.config.powerUp.duration);
    }

    deactivatePowerup() {
        this.powerupActive = false;
        if (this.powerField) {
            gsap.killTweensOf(this.powerField);
            this.sprite.removeChild(this.powerField);
            this.powerField.destroy();
            this.powerField = null;
        }

    }

    startJump() {
        if (this.platform || this.jumpIndex === 1) {
            ++this.jumpIndex;
            this.platform = null;
            Matter.Body.setVelocity(this.body, { x: 0, y: -this.dy });
        }
    }

    // [08]
    stayOnPlatform(platform) {
        this.platform = platform;
        this.jumpIndex = 0;
    }
    // [/08]

    createBody() {
        this.body = Matter.Bodies.rectangle(this.sprite.x + this.sprite.width / 2, this.sprite.y + this.sprite.height / 2, this.sprite.width, this.sprite.height, { friction: 0 });
        Matter.World.add(App.physics.world, this.body);
        this.body.gameHero = this;
    }
    
    createSprite() {
        this.sprite = new PIXI.AnimatedSprite([
            App.res("walk1"),
            App.res("walk2")
        ]);

        this.sprite.x = App.config.hero.position.x;
        this.sprite.y = App.config.hero.position.y;
        this.sprite.loop = true;
        this.sprite.animationSpeed = 0.1;
        this.sprite.play();
    }

    destroy() {
        App.app.ticker.remove(this.update, this);
        Matter.World.add(App.physics.world, this.body);
        gsap.killTweensOf(this.sprite);
        this.sprite.destroy();
    }

    update() {
        this.sprite.x = this.body.position.x - this.sprite.width / 2;
        this.sprite.y = this.body.position.y - this.sprite.height / 2;

        if (this.powerupActive) {
            this.startAttractingDiamonds();
        }
        
        // [14]
        if (this.sprite.y > window.innerHeight) {
            this.sprite.emit("die");
        }
        // [/14]
    }

    startAttractingDiamonds(){
        const heroPosition = {
            x: this.sprite.x + this.sprite.width / 2,
            y: this.sprite.y + this.sprite.height / 2,
        };

        const nearbyDiamonds = App.diamondManager.getNearbyDiamonds(
            heroPosition.x,
            heroPosition.y,
            App.config.powerUp.radius,
        );
        
        for(const diamond of nearbyDiamonds){
            if(this.attractedDiamonds.has(diamond)) continue;

            const tween = gsap.to({}, {
                duration: 0.6,
                ease: "power1.in",
                onUpdate: () => {
                    if(!diamond.body?.destroyed) {
                        diamond.sprite.x = gsap.utils.interpolate(
                            diamond.sprite.x,
                            this.sprite.x - diamond.sprite.parent.x,
                            0.05
                        );
                        diamond.sprite.y = gsap.utils.interpolate(
                            diamond.sprite.y, 
                            this.sprite.y - diamond.sprite.parent.y,
                            0.5
                        )
                    }
                },
                onComplete: () => {
                    if(diamond.sprite){
                        this.collectDiamond(diamond)
                    }
                }
            });
            this.attractedDiamonds.set(diamond, tween);
        }
    }
}