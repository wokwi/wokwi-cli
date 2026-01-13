#include "wokwi-api.h"
#include <stdio.h>

static pin_t pin_out;
static timer_t init_timer;

static void on_timer(void *user_data) {
  (void)user_data;
  printf("TEST_CHIP_READY\n");
  pin_write(pin_out, HIGH);
}

void chip_init(void) {
  printf("TEST_CHIP_INIT\n");

  pin_out = pin_init("OUT", OUTPUT);
  pin_write(pin_out, LOW);

  // Use a timer to print after initialization is complete
  const timer_config_t timer_config = {
    .callback = on_timer,
    .user_data = NULL,
  };
  init_timer = timer_init(&timer_config);
  timer_start(init_timer, 100, false);  // 100 microseconds
}
