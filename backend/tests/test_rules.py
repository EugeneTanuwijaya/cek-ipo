from app.rules import ara_pct, tick_for, day1_ara_price, hit_ara_day1

def test_ara_pct_bands():
    assert ara_pct(100) == 0.35
    assert ara_pct(200) == 0.35   # batas atas band pertama inklusif
    assert ara_pct(201) == 0.25
    assert ara_pct(5000) == 0.25
    assert ara_pct(5001) == 0.20

def test_tick():
    assert tick_for(199) == 1 and tick_for(200) == 2 and tick_for(499) == 2
    assert tick_for(500) == 5 and tick_for(1999) == 5 and tick_for(2000) == 10
    assert tick_for(4999) == 10 and tick_for(5000) == 25

def test_day1_ara_price():
    assert day1_ara_price(100) == 170          # 100*1.70, fraksi 1
    assert day1_ara_price(1000) == 1500        # 1000*1.50, fraksi 5
    assert day1_ara_price(350) == 525          # 350*1.50=525, fraksi 5 (525 valid)

def test_hit_ara_day1():
    assert hit_ara_day1(350, 525) is True
    assert hit_ara_day1(350, 500) is False
