"""
Generate synthetic heritage images with realistic historical damage for testing.
Creates 5 test cases:
1. fresco_cracks.png (Ancient fresco painting with fine and deep cracks)
2. ancient_manuscript_tear.png (Aged parchment manuscript with stains and torn/missing section)
3. monument_erosion.png (Stone monument with weather erosion and water stains)
4. sculpture_damaged.png (Classical marble bust with crack fractures and missing nose/ear segment)
5. historic_portrait_scratched.png (Renaissance portrait with fine scratch lines and varnish flaking)
"""
import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUTPUT_DIR = "sample_images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def generate_fresco():
    w, h = 600, 600
    # Warm terracotta/plaster background with texture
    base = np.zeros((h, w, 3), dtype=np.uint8)
    base[:, :] = [185, 205, 225]  # BGR warm beige/ochre plaster
    
    # Add plaster noise & variations
    noise = np.random.normal(0, 18, (h, w, 3)).astype(np.int16)
    fresco = np.clip(base.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Paint ancient fresco motifs (geometric arches and floral medallions)
    cv2.circle(fresco, (300, 300), 160, (70, 90, 160), -1)  # terracotta medallion
    cv2.circle(fresco, (300, 300), 130, (140, 175, 200), -1)
    cv2.circle(fresco, (300, 300), 80, (60, 120, 90), -1)   # aged copper green center
    cv2.ellipse(fresco, (300, 300), (220, 220), 0, 0, 360, (50, 70, 120), 8)
    
    # Decorative border
    cv2.rectangle(fresco, (20, 20), (580, 580), (70, 80, 130), 6)
    cv2.rectangle(fresco, (35, 35), (565, 565), (100, 140, 180), 3)
    
    # Add deep branching cracks
    for _ in range(5):
        pt1 = (np.random.randint(50, 550), np.random.randint(50, 550))
        for _ in range(8):
            dx = np.random.randint(-40, 40)
            dy = np.random.randint(-40, 40)
            pt2 = (np.clip(pt1[0] + dx, 10, 590), np.clip(pt1[1] + dy, 10, 590))
            cv2.line(fresco, pt1, pt2, (25, 25, 30), np.random.randint(2, 4))
            pt1 = pt2

    # Save
    Image.fromarray(cv2.cvtColor(fresco, cv2.COLOR_BGR2RGB)).save(os.path.join(OUTPUT_DIR, "fresco_cracks.png"))
    print("Created fresco_cracks.png")

def generate_manuscript():
    w, h = 600, 700
    # Aged parchment base (yellowed brown)
    parchment = np.zeros((h, w, 3), dtype=np.uint8)
    parchment[:, :] = [180, 215, 235]  # BGR light parchment
    
    # Vignette / darkening at edges
    Y, X = np.ogrid[:h, :w]
    dist_from_center = np.sqrt((X - w/2)**2 + (Y - h/2)**2)
    vignette = (dist_from_center / (max(w, h)/1.2)).clip(0, 1)
    parchment = (parchment.astype(np.float32) * (1.0 - vignette[:, :, np.newaxis] * 0.35)).astype(np.uint8)
    
    # Add script text lines
    for line_y in range(90, 580, 26):
        # Draw wavy script-like line segments
        x = 70
        while x < 530:
            seg_len = np.random.randint(15, 50)
            y_jitter = line_y + np.random.randint(-2, 2)
            cv2.line(parchment, (x, y_jitter), (min(530, x + seg_len), y_jitter), (40, 30, 25), 2)
            x += seg_len + np.random.randint(6, 16)
            
    # Add large moisture/tea stain
    stain_overlay = parchment.copy()
    cv2.circle(stain_overlay, (200, 280), 90, (90, 140, 170), -1)
    cv2.circle(stain_overlay, (420, 480), 75, (100, 150, 180), -1)
    parchment = cv2.addWeighted(parchment, 0.65, stain_overlay, 0.35, 0)
    
    # Missing torn corner / hole
    pts = np.array([[460, 20], [580, 20], [580, 180], [500, 140], [450, 80]], np.int32)
    cv2.fillPoly(parchment, [pts], (15, 15, 15)) # dark background showing through hole

    Image.fromarray(cv2.cvtColor(parchment, cv2.COLOR_BGR2RGB)).save(os.path.join(OUTPUT_DIR, "ancient_manuscript_tear.png"))
    print("Created ancient_manuscript_tear.png")

def generate_monument():
    w, h = 600, 600
    # Weathered sandstone block
    stone = np.zeros((h, w, 3), dtype=np.uint8)
    stone[:, :] = [160, 180, 195]  # BGR weathered sandstone
    
    # Sandstone grain
    grain = np.random.normal(0, 22, (h, w, 3)).astype(np.int16)
    stone = np.clip(stone.astype(np.int16) + grain, 0, 255).astype(np.uint8)
    
    # Carved classical relief (pediment & pillar)
    cv2.rectangle(stone, (120, 200), (220, 540), (120, 140, 155), -1) # left column
    cv2.rectangle(stone, (380, 200), (480, 540), (120, 140, 155), -1) # right column
    cv2.rectangle(stone, (80, 150), (520, 200), (105, 125, 140), -1)  # lintel
    
    # Fluting lines on pillars
    for x in [145, 170, 195, 405, 430, 455]:
        cv2.line(stone, (x, 210), (x, 530), (80, 95, 110), 3)

    # Weather erosion and missing chunk on lintel
    cv2.ellipse(stone, (300, 160), (90, 45), 0, 0, 360, (20, 20, 25), -1)
    
    # Water runoff streaks
    for sx in [160, 280, 350, 440]:
        cv2.line(stone, (sx, 170), (sx + np.random.randint(-10, 10), 450), (60, 75, 85), 5)

    Image.fromarray(cv2.cvtColor(stone, cv2.COLOR_BGR2RGB)).save(os.path.join(OUTPUT_DIR, "monument_erosion.png"))
    print("Created monument_erosion.png")

def generate_sculpture():
    w, h = 600, 600
    marble = np.zeros((h, w, 3), dtype=np.uint8)
    marble[:, :] = [210, 220, 225]  # BGR cool marble
    
    # Marble veining
    for _ in range(6):
        pt1 = (np.random.randint(0, w), np.random.randint(0, h))
        for _ in range(12):
            dx = np.random.randint(-50, 50)
            dy = np.random.randint(-50, 50)
            pt2 = (np.clip(pt1[0] + dx, 0, w-1), pt1[1] + dy)
            cv2.line(marble, pt1, pt2, (170, 180, 190), 2)
            pt1 = pt2
            
    # Carved classical bust silhouette
    cv2.ellipse(marble, (300, 250), (120, 160), 0, 0, 360, (175, 185, 195), -1) # Head
    cv2.rectangle(marble, (240, 380), (360, 520), (160, 170, 180), -1)          # Neck/torso
    cv2.ellipse(marble, (300, 520), (220, 80), 0, 0, 360, (140, 150, 160), -1)  # Pedestal base
    
    # Fracture crack across the face
    pts = [(200, 180), (250, 220), (290, 260), (330, 270), (400, 310)]
    for i in range(len(pts)-1):
        cv2.line(marble, pts[i], pts[i+1], (30, 30, 35), 4)
        
    # Missing chunk / break
    cv2.circle(marble, (290, 280), 40, (15, 15, 20), -1)

    Image.fromarray(cv2.cvtColor(marble, cv2.COLOR_BGR2RGB)).save(os.path.join(OUTPUT_DIR, "sculpture_damaged.png"))
    print("Created sculpture_damaged.png")

def generate_portrait():
    w, h = 600, 600
    canvas = np.zeros((h, w, 3), dtype=np.uint8)
    canvas[:, :] = [45, 60, 80]  # Deep Renaissance oil background
    
    # Subject portrait
    cv2.ellipse(canvas, (300, 270), (130, 170), 0, 0, 360, (140, 170, 215), -1) # Flesh tones
    cv2.ellipse(canvas, (300, 480), (210, 140), 0, 0, 360, (25, 30, 70), -1)   # Dark velvet garment
    cv2.circle(canvas, (255, 250), 12, (50, 40, 30), -1) # Eye L
    cv2.circle(canvas, (345, 250), 12, (50, 40, 30), -1) # Eye R
    cv2.ellipse(canvas, (300, 340), (35, 15), 0, 0, 360, (60, 60, 140), -1)    # Lips
    
    # Scratches & canvas craquelure lines
    for _ in range(18):
        x1, y1 = np.random.randint(50, 550), np.random.randint(50, 550)
        length = np.random.randint(40, 180)
        angle = np.random.uniform(0, 2 * np.pi)
        x2 = int(np.clip(x1 + length * np.cos(angle), 10, 590))
        y2 = int(np.clip(y1 + length * np.sin(angle), 10, 590))
        cv2.line(canvas, (x1, y1), (x2, y2), (230, 235, 240), np.random.randint(1, 3))
        
    # Paint flaking spot
    cv2.circle(canvas, (310, 230), 22, (20, 25, 30), -1)

    Image.fromarray(cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB)).save(os.path.join(OUTPUT_DIR, "historic_portrait_scratched.png"))
    print("Created historic_portrait_scratched.png")

if __name__ == "__main__":
    generate_fresco()
    generate_manuscript()
    generate_monument()
    generate_sculpture()
    generate_portrait()
    print("All 5 heritage sample test cases successfully generated!")
