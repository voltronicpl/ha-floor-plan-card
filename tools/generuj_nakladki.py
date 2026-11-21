import os
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops
D="/tmp/claude-0/-home-user/80a74606-d4ba-56eb-8078-b1ae4390fb1b/scratchpad/gen/out"
os.makedirs(D+"/stany",exist_ok=True)
src=Image.open(D+"/plan_domu.png").convert("RGB"); W,H=src.size
# night base
night=ImageEnhance.Brightness(src).enhance(0.32)
night=ImageChops.multiply(night,Image.new("RGB",src.size,(185,200,255)))
night.save(D+"/plan_domu_noc.png")
# warm lit version
lit=ImageEnhance.Brightness(src).enhance(1.12)
lit=Image.blend(lit,Image.new("RGB",src.size,(255,214,120)),0.12)
rooms={
 "garaz":[(118,65),(402,65),(402,652),(70,652)],
 "warsztat":[(415,60),(768,60),(768,305),(415,305)],
 "salon":[(772,60),(1142,60),(1142,470),(772,470),(772,402),(415,402),(415,310),(772,310)],
 "biuro":[(1142,60),(1212,60),(1278,368),(1142,368)],
 "sypialnia":[(1222,60),(1608,60),(1702,366),(1288,366)],
 "silownia":[(415,412),(642,412),(642,652),(418,652)],
 "lazienka":[(645,412),(778,412),(782,652),(648,652)],
 "kuchnia":[(775,472),(1142,472),(1148,652),(780,652)],
 "korytarz":[(1145,372),(1352,372),(1338,652),(1190,652)],
 "garderoba":[(1352,372),(1440,372),(1470,652),(1338,652)],
 "pralnia_wc":[(1412,375),(1832,375),(1852,652),(1470,652)],
}
for k,p in rooms.items():
    m=Image.new("L",src.size,0); ImageDraw.Draw(m).polygon(p,fill=255)
    m=m.filter(ImageFilter.GaussianBlur(10)); z=Image.new("RGB",src.size,(0,0,0)); base=Image.composite(lit,z,m.point(lambda v:255 if v>0 else 0))
    o=base.convert("RGBA"); o.putalpha(m); o.save(f"{D}/stany/swiatlo_{k}.png",optimize=True)
Image.new("RGBA",src.size,(0,0,0,0)).save(D+"/stany/pusty.png",optimize=True)
def opening(dr,box):
    x0,y0,x1,y1=box
    for i in range(y1-y0):
        c=int(8+22*i/(y1-y0)); dr.line([(x0,y0+i),(x1,y0+i)],fill=(c,c-2,c-4,255))
# gate open: roller door rolled up
g=Image.new("RGBA",src.size,(0,0,0,0)); dr=ImageDraw.Draw(g)
opening(dr,(102,662,352,755))
dr.rectangle([102,662,352,674],fill=(70,62,55,255))
for y in (666,670): dr.line([(102,y),(352,y)],fill=(40,35,30,255))
g.save(D+"/stany/brama_otwarta.png",optimize=True)
# gate closed: copy of original gate (lit facade look)
gc=Image.new("RGBA",src.size,(0,0,0,0)); gc.paste(night.crop((102,662,352,755)),(102,662)); gc.save(D+"/stany/brama_zamknieta.png",optimize=True)
def door(name,box,hinge_left):
    x0,y0,x1,y1=box; w=x1-x0
    o=Image.new("RGBA",src.size,(0,0,0,0)); dr=ImageDraw.Draw(o)
    opening(dr,box)
    leaf=(66,56,48,255); sk=int(w*0.45)
    if hinge_left: poly=[(x0,y0),(x0-sk,y0+10),(x0-sk,y1+8),(x0,y1)]
    else: poly=[(x1,y0),(x1+sk,y0+10),(x1+sk,y1+8),(x1,y1)]
    dr.polygon(poly,fill=leaf,outline=(40,34,30,255))
    o.save(f"{D}/stany/{name}_otwarte.png",optimize=True)
    c=Image.new("RGBA",src.size,(0,0,0,0)); c.paste(night.crop(box),(x0,y0)); c.save(f"{D}/stany/{name}_zamkniete.png",optimize=True)
door("drzwi1",(390,671,445,759),False)
door("drzwi2",(1200,660,1269,760),False)
# preview: some lights on, gate open, door1 open
def comp(on,gate,d1,d2,out):
    b=night.convert("RGBA")
    for k in on: b=Image.alpha_composite(b,Image.open(f"{D}/stany/swiatlo_{k}.png"))
    b=Image.alpha_composite(b,Image.open(f"{D}/stany/brama_{gate}.png"))
    b=Image.alpha_composite(b,Image.open(f"{D}/stany/drzwi1_{d1}.png"))
    b=Image.alpha_composite(b,Image.open(f"{D}/stany/drzwi2_{d2}.png"))
    b.convert("RGB").save(out)
comp(["garaz","salon","kuchnia","sypialnia"],"otwarta","otwarte","zamkniete",D+"/podglad_stany_1.png")
comp([],"zamknieta","zamkniete","otwarte",D+"/podglad_stany_2.png")
