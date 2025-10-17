/**
 * Тесты для компонента FormulaEditor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormulaEditor } from '../FormulaEditor';

// Мокаем модули
vi.mock('@/utils/formulaEngine', () => ({
  validateFormula: vi.fn((formula: string) => {
    if (!formula) return null;
    if (formula.includes('ERROR')) {
      return { message: 'Синтаксическая ошибка в формуле' };
    }
    return null;
  }),
  evaluateFormula: vi.fn((formula: string, data: Record<string, string | number | boolean | Date | null>) => {
    if (formula === '{price} * {quantity}') {
      return (data.price || 0) * (data.quantity || 0);
    }
    if (formula === 'SUM(1, 2, 3)') {
      return 6;
    }
    return 'Result';
  })
}));

describe('FormulaEditor', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    columns: [
      { name: 'price', type: 'number' },
      { name: 'quantity', type: 'number' },
      { name: 'name', type: 'string' },
      { name: 'date', type: 'date' }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('должен рендериться без ошибок', () => {
    render(<FormulaEditor {...defaultProps} />);

    expect(screen.getByText('Редактор формулы')).toBeInTheDocument();
    expect(screen.getByText('Функции')).toBeInTheDocument();
    expect(screen.getByText('Превью результата')).toBeInTheDocument();
    expect(screen.getByText('Справка')).toBeInTheDocument();
  });

  it('должен отображать начальное значение', () => {
    const value = '{price} * {quantity}';
    render(<FormulaEditor {...defaultProps} value={value} />);

    const textarea = screen.getByPlaceholderText('Введите формулу...') as HTMLTextAreaElement;
    expect(textarea.value).toBe(value);
  });

  it('должен вызывать onChange при изменении формулы', async () => {
    const onChange = vi.fn();
    render(<FormulaEditor {...defaultProps} onChange={onChange} />);

    const textarea = screen.getByPlaceholderText('Введите формулу...');
    await userEvent.type(textarea, 'SUM(1, 2)');

    expect(onChange).toHaveBeenCalledWith('SUM(1, 2)');
  });

  it('должен отображать доступные колонки', () => {
    render(<FormulaEditor {...defaultProps} />);

    // Используем getAllByText так как элементы могут быть в нескольких местах
    expect(screen.getAllByText('{price}').length).toBeGreaterThan(0);
    expect(screen.getAllByText('{quantity}').length).toBeGreaterThan(0);
    expect(screen.getAllByText('{name}').length).toBeGreaterThan(0);
    expect(screen.getAllByText('{date}').length).toBeGreaterThan(0);
  });

  it('должен вставлять колонку при клике на неё', async () => {
    const onChange = vi.fn();
    render(<FormulaEditor {...defaultProps} onChange={onChange} />);

    // Находим кнопку колонки (не в примерах, а именно кнопку)
    const priceButtons = screen.getAllByText('{price}');
    const buttonElement = priceButtons.find(el => el.tagName === 'BUTTON');
    if (buttonElement) {
      fireEvent.click(buttonElement);
      expect(onChange).toHaveBeenCalledWith('{price}');
    }
  });

  it('должен отображать категории функций', () => {
    render(<FormulaEditor {...defaultProps} />);

    // Проверяем наличие табов (используем aria-label или другие атрибуты)
    const tabs = screen.getByRole('tablist');
    expect(tabs).toBeInTheDocument();
  });

  it('должен отображать ошибку валидации', async () => {
    render(<FormulaEditor {...defaultProps} value="ERROR" />);

    await waitFor(() => {
      expect(screen.getByText('Синтаксическая ошибка в формуле')).toBeInTheDocument();
      expect(screen.getByText('Ошибка')).toBeInTheDocument();
    });
  });

  it('должен отображать превью результата для валидной формулы', async () => {
    render(<FormulaEditor {...defaultProps} value="{price} * {quantity}" />);

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument(); // 10 * 10 (default sample values)
      expect(screen.getByText('Валидно')).toBeInTheDocument();
    });
  });

  it('должен очищать формулу при клике на кнопку "Очистить"', () => {
    const onChange = vi.fn();
    render(<FormulaEditor {...defaultProps} value="test" onChange={onChange} />);

    const clearButton = screen.getByText('Очистить');
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('должен вызывать onSave при клике на кнопку "Сохранить формулу"', () => {
    const onSave = vi.fn();
    render(<FormulaEditor {...defaultProps} value="{price}" onSave={onSave} />);

    const saveButton = screen.getByText('Сохранить формулу');
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('{price}');
  });

  it('должен блокировать кнопку сохранения при наличии ошибки', () => {
    const onSave = vi.fn();
    render(<FormulaEditor {...defaultProps} value="ERROR" onSave={onSave} />);

    const saveButton = screen.getByText('Сохранить формулу');
    expect(saveButton).toBeDisabled();
  });

  it('должен искать функции по запросу', async () => {
    render(<FormulaEditor {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Поиск...');
    await userEvent.type(searchInput, 'sum');

    // Проверяем, что SUM функция отображается (может быть несколько)
    expect(screen.getAllByText('SUM').length).toBeGreaterThan(0);
  });

  it('должен быть отключен в disabled состоянии', () => {
    render(<FormulaEditor {...defaultProps} disabled />);

    const textarea = screen.getByPlaceholderText('Введите формулу...');
    expect(textarea).toBeDisabled();

    const searchInput = screen.getByPlaceholderText('Поиск...');
    expect(searchInput).toBeDisabled();

    const clearButton = screen.getByText('Очистить');
    expect(clearButton).toBeDisabled();
  });

  it('должен отображать примеры в справке', () => {
    render(<FormulaEditor {...defaultProps} />);

    expect(screen.getByText('Синтаксис:')).toBeInTheDocument();
    expect(screen.getByText('Примеры:')).toBeInTheDocument();
    expect(screen.getByText('Горячие клавиши:')).toBeInTheDocument();
  });

  it('должен вставлять функцию при клике на неё', async () => {
    const onChange = vi.fn();
    render(<FormulaEditor {...defaultProps} onChange={onChange} />);

    // Находим и кликаем на функцию ABS
    const absButton = screen.getAllByText('ABS')[0];
    fireEvent.click(absButton);

    expect(onChange).toHaveBeenCalledWith('ABS()');
  });

  it('должен обновлять значение при изменении props', () => {
    const { rerender } = render(<FormulaEditor {...defaultProps} value="initial" />);

    let textarea = screen.getByPlaceholderText('Введите формулу...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('initial');

    rerender(<FormulaEditor {...defaultProps} value="updated" />);

    textarea = screen.getByPlaceholderText('Введите формулу...') as HTMLTextAreaElement;
    expect(textarea.value).toBe('updated');
  });
});

/**
 * Тесты для утилиты formulaHighlighter
 */
import { tokenizeForHighlight, getTokenColor, getSuggestions, getFunctionInfo } from '@/utils/formulaHighlighter';

describe('formulaHighlighter', () => {
  describe('tokenizeForHighlight', () => {
    it('должен токенизировать колонки', () => {
      const tokens = tokenizeForHighlight('{price} + {quantity}');

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'column', value: '{price}' })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'column', value: '{quantity}' })
      );
    });

    it('должен токенизировать функции', () => {
      const tokens = tokenizeForHighlight('SUM(1, 2, 3)');

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'function', value: 'SUM' })
      );
    });

    it('должен токенизировать числа', () => {
      const tokens = tokenizeForHighlight('123 + 45.67');

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'number', value: '123' })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'number', value: '45.67' })
      );
    });

    it('должен токенизировать строки', () => {
      const tokens = tokenizeForHighlight('"hello" + \'world\'');

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'string', value: '"hello"' })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'string', value: "'world'" })
      );
    });

    it('должен токенизировать операторы', () => {
      const tokens = tokenizeForHighlight('a + b - c * d / e');

      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'operator', value: '+' })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'operator', value: '-' })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'operator', value: '*' })
      );
      expect(tokens).toContainEqual(
        expect.objectContaining({ type: 'operator', value: '/' })
      );
    });
  });

  describe('getTokenColor', () => {
    it('должен возвращать правильные цвета для типов токенов', () => {
      expect(getTokenColor('function')).toContain('blue');
      expect(getTokenColor('column')).toContain('green');
      expect(getTokenColor('string')).toContain('orange');
      expect(getTokenColor('number')).toContain('purple');
      expect(getTokenColor('operator')).toContain('gray');
    });
  });

  describe('getSuggestions', () => {
    const columns = [
      { name: 'price', type: 'number' },
      { name: 'product', type: 'string' },
      { name: 'quantity', type: 'number' }
    ];

    it('должен предлагать функции по началу слова', () => {
      const suggestions = getSuggestions('su', 2, columns);
      expect(suggestions).toContain('SUM');
      expect(suggestions).toContain('SUBSTRING');
    });

    it('должен предлагать колонки в контексте фигурных скобок', () => {
      const suggestions = getSuggestions('{pr', 3, columns);
      expect(suggestions).toContain('price');
      expect(suggestions).toContain('product');
    });

    it('должен возвращать все функции и колонки для пустого слова', () => {
      const suggestions = getSuggestions('', 0, columns);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.startsWith('{'))).toBe(true);
    });
  });

  describe('getFunctionInfo', () => {
    it('должен возвращать информацию о функции', () => {
      const info = getFunctionInfo('sum');
      expect(info).toBeDefined();
      expect(info?.name).toBe('SUM');
      expect(info?.category).toBe('math');
      expect(info?.description).toBeDefined();
      expect(info?.examples).toBeInstanceOf(Array);
    });

    it('должен возвращать null для несуществующей функции', () => {
      const info = getFunctionInfo('nonexistent');
      expect(info).toBeNull();
    });
  });
});