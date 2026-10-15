import { describe, expect, it } from 'vitest';
import { toBytes } from '../../src/serial/bytes';
import { ByteQueue } from '../../src/serial/byteQueue';
import { ProtocolError, PythonError, TimeoutError } from '../../src/serial/errors';
import {
  enterRawRepl,
  exec,
  execChecked,
  exitRawRepl,
  type ReplChannel,
  type ReplState,
} from '../../src/serial/rawRepl';
import { FakePico, type FakePicoOptions } from '../../src/dev/simulatedPico';

function connect(options: FakePicoOptions = {}) {
  const board = new FakePico(options);
  const rx = new ByteQueue();
  board.onData = (data) => rx.push(data);
  const channel: ReplChannel = {
    write: (data) => board.write(toBytes(data)),
    rx,
  };
  const state: ReplState = { useRawPaste: true };
  return { board, channel, state };
}

const echo = (stdout: string) => () => ({ stdout, stderr: '' });

describe('raw REPL', () => {
  it('enters the raw REPL and runs code', async () => {
    const { board, channel, state } = connect({ executor: echo('hello\r\n') });
    await enterRawRepl(channel);
    const result = await exec(channel, 'print("hello")', state);
    expect(result).toEqual({ stdout: 'hello\r\n', stderr: '' });
    expect(board.executed).toEqual(['print("hello")']);
  });

  it('soft resets on the way in, without running main.py', async () => {
    const { board, channel, state } = connect({
      files: { '/main.py': 'print("boot")' },
      executor: echo(''),
    });
    await enterRawRepl(channel, { softReset: true });
    expect(board.softResets).toBe(1);
    await execChecked(channel, 'pass', state);
    // main.py only runs from the friendly REPL, so nothing of it appears.
    expect(board.executed).toEqual(['pass']);
  });

  it('uploads a long program through raw-paste flow control', async () => {
    const { board, channel, state } = connect({ windowSize: 64, executor: echo('') });
    const program = Array.from(
      { length: 200 },
      (_, i) => `print(${i})  # padding to force several flow-control windows`,
    ).join('\n');
    await enterRawRepl(channel);
    await execChecked(channel, program, state);
    expect(board.executed[0]).toBe(program);
    expect(state.useRawPaste).toBe(true);
  });

  it('falls back when the firmware declines raw paste', async () => {
    const { board, channel, state } = connect({
      rawPaste: 'unsupported',
      executor: echo('ok\r\n'),
    });
    await enterRawRepl(channel);
    expect(await execChecked(channel, 'print(1)', state)).toBe('ok\r\n');
    expect(state.useRawPaste).toBe(false);
    expect(board.executed).toEqual(['print(1)']);
  });

  it('falls back on firmware that predates raw paste', async () => {
    const { board, channel, state } = connect({
      rawPaste: 'ancient',
      executor: echo('ok\r\n'),
    });
    await enterRawRepl(channel);
    expect(await execChecked(channel, 'print(1)', state)).toBe('ok\r\n');
    expect(state.useRawPaste).toBe(false);
    expect(board.executed).toEqual(['print(1)']);
  });

  it('keeps the prompt in step across several commands', async () => {
    const { board, channel, state } = connect({ executor: echo('x\r\n') });
    await enterRawRepl(channel);
    for (let i = 0; i < 5; i++) {
      expect(await execChecked(channel, `print(${i})`, state)).toBe('x\r\n');
    }
    expect(board.executed).toHaveLength(5);
  });

  it('turns a traceback into a PythonError', async () => {
    const { channel, state } = connect({
      executor: () => ({
        stdout: '',
        stderr:
          'Traceback (most recent call last):\r\n  File "<stdin>", line 1, in <module>\r\nOSError: [Errno 2] ENOENT\r\n',
      }),
    });
    await enterRawRepl(channel);
    await expect(execChecked(channel, 'open("nope")', state)).rejects.toThrow(
      PythonError,
    );
    await expect(execChecked(channel, 'open("nope")', state)).rejects.toThrow(
      'OSError: [Errno 2] ENOENT',
    );
  });

  it('separates stdout from the traceback', async () => {
    const { channel, state } = connect({
      executor: () => ({ stdout: 'partial\r\n', stderr: 'ValueError: bad pin\r\n' }),
    });
    await enterRawRepl(channel);
    const result = await exec(channel, 'x', state);
    expect(result.stdout).toBe('partial\r\n');
    expect(result.stderr).toBe('ValueError: bad pin\r\n');
  });

  it('returns to the friendly REPL', async () => {
    const { board, channel } = connect();
    await enterRawRepl(channel);
    await exitRawRepl(channel);
    // A friendly-mode board echoes what you type; a raw one stays silent.
    await channel.write('A');
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(board.executed).toEqual([]);
    expect(channel.rx.length).toBeGreaterThan(0);
  });

  it('gives up with a timeout when the board says nothing', async () => {
    const rx = new ByteQueue();
    const channel: ReplChannel = { write: async () => undefined, rx };
    await expect(
      enterRawRepl(channel, { attempts: 1 }),
    ).rejects.toBeInstanceOf(TimeoutError);
  }, 20000);

  it('rejects a board that answers with nonsense', async () => {
    const rx = new ByteQueue();
    const channel: ReplChannel = {
      write: async (data) => {
        const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
        if (text.includes('\x01')) rx.push(toBytes('raw REPL; CTRL-B to exit\r\n>'));
        else if (text.includes('\x05A')) rx.push(toBytes('??'));
        else if (text === '\x04') rx.push(toBytes('NO'));
      },
      rx,
    };
    await enterRawRepl(channel);
    await expect(
      exec(channel, 'print(1)', { useRawPaste: false }),
    ).rejects.toBeInstanceOf(ProtocolError);
  });
});
