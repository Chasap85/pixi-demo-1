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

    update() {
        this.sprite.x = this.body.position.x - this.sprite.width / 2;
        this.sprite.y = this.body.position.y - this.sprite.height / 2;

        if (this.powerupActive) {
            this.attractNearbyDiamonds();
        }
        
        // [14]
        if (this.sprite.y > window.innerHeight) {
            this.sprite.emit("die");
        }
        // [/14]
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

    getDistance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    attractNearbyDiamonds() {
        if (!this.powerupActive) return;

        const heroX = this.sprite.x + this.sprite.width / 2;
        const heroY = this.sprite.y + this.sprite.height / 2;
        const attractRadius = 300;

        // Get all platforms from the game scene
        const platforms = App.scenes.scene.platforms.platforms;

        // for each platform container get all diamond cooridinates
        platforms.forEach(platform => {
            platform.diamonds.forEach(diamond => {
                if (this.attractedDiamonds.has(diamond)) return;
                if (!diamond.sprite || !diamond.body) return;

                const diamondX = diamond.sprite.x + diamond.sprite.parent.x + diamond.sprite.width / 2;
                const diamondY = diamond.sprite.y + diamond.sprite.parent.y + diamond.sprite.height / 2;
                
                const distance = this.getDistance(heroX, heroY, diamondX, diamondY);

                if (distance <= attractRadius) {
                    const tween = gsap.to({
                        progress: 0,
                        startX: diamond.sprite.x,
                        startY: diamond.sprite.y
                    }, {
                        progress: 1,
                        duration: 0.6,
                        ease: "power1.in",
                        // keeps track of position of diamonds relative to the hero
                        onUpdate: () => {
                            diamond.sprite.x = gsap.utils.interpolate(
                                diamond.sprite.x, // start pos
                                this.sprite.x - diamond.sprite.parent.x + this.sprite.width / 2, //end pos
                                .05 // progress
                            );
                            diamond.sprite.y = gsap.utils.interpolate(
                                diamond.sprite.y,
                                this.sprite.y - diamond.sprite.parent.y + this.sprite.height / 2,
                                .05
                            );
                        },
                        onComplete: () => {
                            if (diamond.sprite && !diamond.sprite.destroyed) {
                                this.collectDiamond(diamond);
                            }
                        }
                    });
                    
                    this.attractedDiamonds.set(diamond, tween);
                }
            });
        });
    }
}