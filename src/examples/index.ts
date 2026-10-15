/** The bundled example projects, loadable from the Examples menu. */
import blink from './blink.json';
import buttonBuzzer from './button-buzzer.json';
import temperatureAlert from './temperature-alert.json';
import { parseProject, type ProjectFile } from '../store/project';

export interface Example {
  id: string;
  title: string;
  summary: string;
  /** What you need to plug in, if anything. */
  hardware: string;
  project: ProjectFile;
}

export const EXAMPLES: Example[] = [
  {
    id: 'blink',
    title: 'Blink the onboard LED',
    summary: 'The "hello world" of hardware: on, wait, off, wait, forever.',
    hardware: 'Nothing to wire — the LED is on the board.',
    project: parseProject(blink),
  },
  {
    id: 'button-buzzer',
    title: 'Button, LED and buzzer',
    summary: 'Hold the button: the LED lights and the buzzer beeps.',
    hardware: 'Button between GP14 and GND, passive buzzer on GP15 and GND.',
    project: parseProject(buttonBuzzer),
  },
  {
    id: 'temperature-alert',
    title: 'Temperature alert',
    summary:
      'Prints the chip temperature once a second and raises an alarm above the threshold.',
    hardware: 'Nothing required; add a buzzer on GP15 to hear the alarm.',
    project: parseProject(temperatureAlert),
  },
];
