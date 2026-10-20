import matplotlib.pyplot as plt
from matplotlib.path import Path
import matplotlib.patches as patches

# Front-view body outline, 200x400 viewBox coords (y grows downward, matching SVG).
# Built as one closed path, traced clockwise from top of head, using cubic
# beziers (C) and a few lines (L). Symmetric about x=100.
segments = [
    ("M", (100, 8)),                                    # top of head
    ("C", (118, 8), (130, 22), (130, 42)),               # head right side down to jaw
    ("C", (130, 55), (124, 62), (116, 66)),              # jaw to neck-right
    ("L", (116, 78)),                                    # neck right side down
    ("C", (128, 82), (150, 90), (160, 100)),             # right shoulder slope
    ("C", (168, 108), (170, 118), (170, 128)),           # right shoulder cap
    ("C", (170, 150), (166, 172), (162, 194)),           # right upper arm outer
    ("C", (159, 210), (156, 224), (154, 236)),           # right forearm outer
    ("C", (153, 244), (155, 250), (161, 251)),           # right hand outer
    ("C", (167, 252), (168, 246), (166, 238)),           # right hand inner
    ("C", (163, 226), (160, 212), (157, 198)),           # right forearm inner
    ("C", (154, 180), (151, 160), (148, 142)),           # right upper arm inner / armpit
    ("C", (146, 152), (144, 164), (142, 176)),           # right torso side (below armpit) upper
    ("C", (139, 190), (140, 200), (144, 212)),           # waist to hip flare (right)
    ("C", (148, 222), (150, 228), (150, 236)),           # right hip outer
    ("C", (150, 248), (146, 254), (139, 256)),           # right hip to thigh
    ("C", (135, 280), (132, 310), (129, 336)),           # right thigh outer
    ("C", (127, 352), (126, 366), (125, 378)),           # right shin outer
    ("C", (124, 386), (126, 392), (132, 393)),           # right foot outer/toe
    ("L", (140, 393)),                                   # right foot bottom
    ("C", (141, 388), (139, 382), (136, 376)),           # right foot inner/ankle
    ("C", (135, 362), (134, 348), (133, 334)),           # right shin inner
    ("C", (132, 312), (130, 288), (127, 266)),           # right thigh inner
    ("C", (125, 258), (119, 254), (111, 252)),           # right groin to center
    ("L", (100, 251)),                                   # center crotch point
    ("L", (89, 252)),                                    # mirror start (left groin)
    ("C", (81, 254), (75, 258), (73, 266)),
    ("C", (70, 288), (68, 312), (67, 334)),
    ("C", (66, 348), (65, 362), (64, 376)),
    ("C", (61, 382), (59, 388), (60, 393)),
    ("L", (68, 393)),
    ("C", (74, 392), (76, 386), (75, 378)),
    ("C", (74, 366), (73, 352), (71, 336)),
    ("C", (68, 310), (65, 280), (61, 256)),
    ("C", (54, 254), (50, 248), (50, 236)),
    ("C", (50, 228), (52, 222), (56, 212)),
    ("C", (60, 200), (61, 190), (58, 176)),
    ("C", (56, 164), (54, 152), (52, 142)),
    ("C", (49, 160), (46, 180), (43, 198)),
    ("C", (40, 212), (37, 226), (34, 238)),
    ("C", (32, 246), (33, 252), (39, 251)),
    ("C", (45, 250), (47, 244), (46, 236)),
    ("C", (44, 224), (41, 210), (38, 194)),
    ("C", (34, 172), (30, 150), (30, 128)),
    ("C", (30, 118), (32, 108), (40, 100)),
    ("C", (50, 90), (72, 82), (84, 78)),
    ("L", (84, 66)),
    ("C", (76, 62), (70, 55), (70, 42)),
    ("C", (70, 22), (82, 8), (100, 8)),
    ("Z", None),
]

def to_matplotlib(segments):
    verts, codes = [], []
    cur = None
    for cmd, pt in segments:
        if cmd == "M":
            verts.append(pt); codes.append(Path.MOVETO); cur = pt
        elif cmd == "L":
            verts.append(pt); codes.append(Path.LINETO); cur = pt
        elif cmd == "C":
            # we stored 3 points per C in sequence via multiple tuples; handled below
            pass
        elif cmd == "Z":
            codes.append(Path.CLOSEPOLY); verts.append(verts[0])
    return verts, codes

# Simpler: build path by iterating and consuming C's 3 control points from a flat list.
verts = []
codes = []
i = 0
pending_c = []
for cmd, pt in segments:
    if cmd == "M":
        verts.append(pt); codes.append(Path.MOVETO)
    elif cmd == "L":
        verts.append(pt); codes.append(Path.LINETO)
    elif cmd == "C":
        pending_c.append(pt)
        if len(pending_c) == 3:
            verts.extend(pending_c); codes.extend([Path.CURVE4]*3)
            pending_c = []
    elif cmd == "Z":
        verts.append(verts[0]); codes.append(Path.CLOSEPOLY)

path = Path(verts, codes)
fig, ax = plt.subplots(figsize=(4, 8))
patch = patches.PathPatch(path, facecolor='#dfe3ea', edgecolor='#33415c', lw=1.5)
ax.add_patch(patch)
ax.set_xlim(0, 200)
ax.set_ylim(400, 0)
ax.set_aspect('equal')
ax.axis('off')
plt.tight_layout()
plt.savefig('/c/Users/Admin/VSC Repos/Hypocrates/scratch/body_preview.png', dpi=150)
print("saved")

# Also emit the SVG path 'd' string using the same C-command triples.
def to_svg_path(segments):
    d = []
    for cmd, pt in segments:
        if cmd == "M":
            d.append(f"M {pt[0]} {pt[1]}")
        elif cmd == "L":
            d.append(f"L {pt[0]} {pt[1]}")
        elif cmd == "C":
            pass
        elif cmd == "Z":
            d.append("Z")
    return d

# Rebuild properly grouping C triples for SVG output
out = []
pending = []
for cmd, pt in segments:
    if cmd == "C":
        pending.append(pt)
        if len(pending) == 3:
            out.append(f"C {pending[0][0]} {pending[0][1]}, {pending[1][0]} {pending[1][1]}, {pending[2][0]} {pending[2][1]}")
            pending = []
    elif cmd == "M":
        out.append(f"M {pt[0]} {pt[1]}")
    elif cmd == "L":
        out.append(f"L {pt[0]} {pt[1]}")
    elif cmd == "Z":
        out.append("Z")

print(" ".join(out))
