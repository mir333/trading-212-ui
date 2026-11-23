import { describe, expect, it } from 'vitest';
import { yahooSymbolFor } from './yahoo-symbol';

describe('yahooSymbolFor', () => {
  it('maps T212 exchange markers to Yahoo suffixes using the instrument short name', () => {
    expect(yahooSymbolFor('RRl_EQ', 'RR')).toBe('RR.L');
    expect(yahooSymbolFor('MET1l_EQ', 'MET1')).toBe('MET1.L');
    expect(yahooSymbolFor('R3NKd_EQ', 'R3NK')).toBe('R3NK.DE');
    expect(yahooSymbolFor('EXENSp_EQ', 'EXENS')).toBe('EXENS.PA');
    expect(yahooSymbolFor('IDRe_EQ', 'IDR')).toBe('IDR.MC');
    expect(yahooSymbolFor('FLXEm_EQ', 'FLXE')).toBe('FLXE.MI');
    expect(yahooSymbolFor('ESCEa_EQ', 'ESCE')).toBe('ESCE.AS');
    expect(yahooSymbolFor('XDN0s_EQ', 'XDN0')).toBe('XDN0.SW');
    expect(yahooSymbolFor('PMET_CA_EQ', 'PMET')).toBe('PMET.TO');
    expect(yahooSymbolFor('EXM_BE_EQ', 'EXM')).toBe('EXM.BR');
    expect(yahooSymbolFor('SWUT_AT_EQ', 'SWUT')).toBe('SWUT.VI');
    expect(yahooSymbolFor('JMT_PT_EQ', 'JMT')).toBe('JMT.LS');
  });
  it('uses the short name for renamed US tickers and Yahoo dash for share classes', () => {
    expect(yahooSymbolFor('ALCC1_US_EQ', 'OKLO')).toBe('OKLO');
    expect(yahooSymbolFor('AI1_US_EQ', 'AI')).toBe('AI');
    expect(yahooSymbolFor('BRK_B_US_EQ', 'BRK.B')).toBe('BRK-B');
  });
  it('handles a marker followed by a digit', () => {
    expect(yahooSymbolFor('V6Cd1_EQ', 'V6C')).toBe('V6C.DE');
  });
  it('derives the base from the ticker when there is no short name', () => {
    expect(yahooSymbolFor('RRl_EQ')).toBe('RR.L');
    expect(yahooSymbolFor('AAPL_US_EQ')).toBe('AAPL');
  });
  it('falls back to the stripped ticker for unknown markers', () => {
    expect(yahooSymbolFor('IWLEq_EQ', 'IWLE')).toBe('IWLEq');
    expect(yahooSymbolFor('YUMC')).toBe('YUMC');
  });
});
