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
    # DAY1_MULTIPLIER=1: hari-1 memakai persentase ARA normal (verifikasi
    # empiris Task 16: COIN 100->135, EMAS 2880->3600, dst.).
    assert day1_ara_price(100) == 135          # 100*1.35, fraksi 1
    assert day1_ara_price(1000) == 1250        # 1000*1.25, fraksi 5
    assert day1_ara_price(350) == 436          # 350*1.25=437.5 -> fraksi 2 -> 436

def test_hit_ara_day1():
    assert hit_ara_day1(350, 436) is True
    assert hit_ara_day1(350, 434) is False

def test_round_down_to_tick_truncates():
    from app.rules import round_down_to_tick
    assert round_down_to_tick(229.5) == 228   # tick 2
    assert round_down_to_tick(178.9) == 178   # tick 1
    assert round_down_to_tick(524.9) == 520   # tick 5

def test_day1_ara_price_rounds_down():
    from app.rules import day1_ara_price
    assert day1_ara_price(199) == 268         # 199*1.35=268.65 -> tick 2 -> 268
