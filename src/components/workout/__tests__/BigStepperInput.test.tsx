/**
 * BigStepperInput — input numérico gigante con steppers −/+ y edición libre por teclado.
 * Cubre tres reglas: el redondeo a "decimals" al usar los botones (evita el arrastre
 * de punto flotante de sumar/restar "step"), el clamp a >= 0 en "−" (nunca reps/peso
 * negativos), y el parseo de texto libre en blur (válido dispara onChange, inválido no).
 */
import { useState } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BigStepperInput } from '@/components/workout/BigStepperInput';

describe('BigStepperInput — botón "+"', () => {
  it('incrementa en "step" y redondea a "decimals", sin arrastre de punto flotante', async () => {
    // 1.1 + 0.1 da 1.2000000000000002 en punto flotante: sin el toFixed(decimals)
    // el onChange emitiría ese arrastre en vez de 1.2.
    const onChange = jest.fn();
    const screen = await render(
      <BigStepperInput label="PESO" value={1.1} step={0.1} decimals={1} onChange={onChange} />
    );

    await fireEvent.press(screen.getByText('+'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(1.2);
  });
});

describe('BigStepperInput — botón "−"', () => {
  it('repetido cerca de 0 nunca dispara onChange con un valor negativo (clamp Math.max(0, ...))', async () => {
    const onChange = jest.fn();
    // Componente controlado real: cada onChange retroalimenta "value", igual que en
    // el uso real dentro de un formulario. Así el segundo/tercer press parte de 0.
    function Controlled() {
      const [value, setValue] = useState(1);
      return (
        <BigStepperInput
          label="PESO"
          value={value}
          step={2.5}
          decimals={1}
          onChange={(v) => {
            onChange(v);
            setValue(v);
          }}
        />
      );
    }

    const screen = await render(<Controlled />);

    await fireEvent.press(screen.getByText('−'));
    await fireEvent.press(screen.getByText('−'));
    await fireEvent.press(screen.getByText('−'));

    expect(onChange).toHaveBeenCalledTimes(3);
    for (const [calledWith] of onChange.mock.calls) {
      expect(calledWith).toBeGreaterThanOrEqual(0);
    }
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});

describe('BigStepperInput — edición libre por teclado', () => {
  it('blur con texto numérico válido dispara onChange con el valor parseado', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <BigStepperInput label="REPS" value={50} step={1} decimals={0} onChange={onChange} />
    );
    const input = screen.getByDisplayValue('50');

    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, '65');
    await fireEvent(input, 'blur');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(65);
  });

  it('blur con texto NO numérico no dispara onChange', async () => {
    const onChange = jest.fn();
    const screen = await render(
      <BigStepperInput label="REPS" value={50} step={1} decimals={0} onChange={onChange} />
    );
    const input = screen.getByDisplayValue('50');

    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'abc');
    await fireEvent(input, 'blur');

    expect(onChange).not.toHaveBeenCalled();
  });
});
