import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { SimulationManager } from './SimulationManager.js';

export class WokwiMCPTools {
  constructor(private readonly simulationManager: SimulationManager) {}

  listTools(): Tool[] {
    return [
      {
        name: 'wokwi_start_simulation',
        description: 'Start a Wokwi simulation',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project directory (optional, defaults to current directory)',
            },
          },
        },
      },
      {
        name: 'wokwi_stop_simulation',
        description: 'Stop the current simulation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'wokwi_resume_simulation',
        description: 'Resume a paused simulation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'wokwi_restart_simulation',
        description: 'Restart the current simulation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'wokwi_get_status',
        description: 'Get the current simulation status',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'wokwi_write_serial',
        description: 'Write data to the serial monitor',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to write to the serial monitor',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'wokwi_read_serial',
        description: 'Read data from the serial monitor',
        inputSchema: {
          type: 'object',
          properties: {
            clear: {
              type: 'boolean',
              description: 'Clear the serial buffer after reading (default: false)',
            },
          },
        },
      },
      {
        name: 'wokwi_read_pin',
        description: 'Read the value of a pin',
        inputSchema: {
          type: 'object',
          properties: {
            partId: {
              type: 'string',
              description: 'ID of the part/component',
            },
            pin: {
              type: 'string',
              description: 'Pin name or number',
            },
          },
          required: ['partId', 'pin'],
        },
      },
      {
        name: 'wokwi_set_control',
        description: 'Set a control value (e.g., potentiometer, button)',
        inputSchema: {
          type: 'object',
          properties: {
            partId: {
              type: 'string',
              description: 'ID of the part/component',
            },
            control: {
              type: 'string',
              description: 'Control name',
            },
            value: {
              type: 'number',
              description: 'Value to set',
            },
          },
          required: ['partId', 'control', 'value'],
        },
      },
      {
        name: 'wokwi_take_screenshot',
        description: 'Take a screenshot of a display component',
        inputSchema: {
          type: 'object',
          properties: {
            partId: {
              type: 'string',
              description: 'ID of the display component',
            },
          },
          required: ['partId'],
        },
      },
    ];
  }

  async callTool(name: string, args: any): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    try {
      switch (name) {
        case 'wokwi_start_simulation':
          await this.simulationManager.startSimulation(args.projectPath);
          return {
            content: [{ type: 'text', text: 'Simulation started successfully' }],
          };

        case 'wokwi_stop_simulation':
          await this.simulationManager.stopSimulation();
          return {
            content: [{ type: 'text', text: 'Simulation stopped' }],
          };

        case 'wokwi_resume_simulation':
          await this.simulationManager.resumeSimulation();
          return {
            content: [{ type: 'text', text: 'Simulation resumed' }],
          };

        case 'wokwi_restart_simulation':
          await this.simulationManager.restartSimulation();
          return {
            content: [{ type: 'text', text: 'Simulation restarted' }],
          };

        case 'wokwi_get_status': {
          const status = await this.simulationManager.getStatus();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(status, null, 2),
              },
            ],
          };
        }

        case 'wokwi_write_serial':
          await this.simulationManager.writeSerial(args.text);
          return {
            content: [{ type: 'text', text: `Written to serial: ${args.text}` }],
          };

        case 'wokwi_read_serial': {
          const output = this.simulationManager.getSerialOutput();
          if (args.clear) {
            this.simulationManager.clearSerialBuffer();
          }
          return {
            content: [{ type: 'text', text: output || 'No serial output' }],
          };
        }

        case 'wokwi_read_pin': {
          const pinValue = await this.simulationManager.readPin(args.partId, args.pin);
          return {
            content: [
              {
                type: 'text',
                text: `Pin ${args.pin} on ${args.partId}: ${pinValue.value} (${pinValue.voltage}V)`,
              },
            ],
          };
        }

        case 'wokwi_set_control':
          await this.simulationManager.setControl(args.partId, args.control, args.value);
          return {
            content: [
              {
                type: 'text',
                text: `Set ${args.control} on ${args.partId} to ${args.value}`,
              },
            ],
          };

        case 'wokwi_take_screenshot': {
          const screenshot = await this.simulationManager.takeScreenshot(args.partId);
          return {
            content: [
              {
                type: 'text',
                text: `Screenshot taken (base64): ${screenshot.substring(0, 100)}...`,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
}