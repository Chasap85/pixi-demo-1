import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import * as Matter from 'matter-js';
import { App } from '../system/App';

export class PowerUp {
    constructor(x, y) {
        this.createSprite(x, y);
        // this.createBody();
        this.createAnimation();
        App.app.ticker.add(this.update, this);
    }

    createSprite(x, y) {
        this.sprite = App.sprite("powerUp");
        this.sprite.x = x;
        this.sprite.y = y;

        const glow = new PIXI.Graphics();
        glow.beginFill(0x4287f5, 0.3)
        glow.drawCircle(this.sprite.width / 2, this.sprite.height / 2, 20);
        glow.endFill();
        this.sprite.addChild(glow);
    }

    createAnimation() {
        gsap.to(this.sprite, {
            y: this.sprite.y - 10,
            duration: 1,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
    }

    activate() {
        if (this.isActive) return;

        this.isActive = true;
        this.indicator.visible = true;
        this.indicator.alpha = 0;
    }

    createBody() {
        this.body = Matter.Bodies.circle(
            this.sprite.x + this.sprite.width / 2,
            this.sprite.y + this.sprite.height / 2,
            this.sprite.width / 2,
            { isSensor: true, isStactic: true, label: "powerup" }
        )
        this.body.gamePowerUp = this;
        Matter.World.add(App.physics.world, this.body);
    }

    update() {
        if (this.sprite){
            Matter.Body.setPosition(this.body, {
                x: this.sprite.width / 2 + this.sprite.x + this.sprite.parent.x,
                y: this.sprite.height / 2 + this.sprite.y + this.sprite.parent.y
            })
        }
    }

    destroy() {
        if (this.sprite){
            App.app.ticker.remove(this.update, this);
            Matter.World.remove(App.physics.world, this.body);
            gsap.killTweensOf(this.sprite);
            this.sprite.destroy();
            this.sprite = null;
        }
    }
}