export interface ESPIDFProjectDescription {
  version: string;
  project_name: string;
  project_version: string;
  project_path: string;
  idf_path: string;
  build_dir: string;
  config_file: string;
  config_defaults: string;
  bootloader_elf: string;
  app_elf: string;
  app_bin: string;
  build_type: string;
  git_revision: string;
  target: string;
  rev: string;
  min_rev: string;
  max_rev: string;
  phy_data_partition: string;
  monitor_baud: string;
  monitor_toolprefix: string;
  c_compiler: string;
  config_environment: Record<string, string>;
  common_components: string[];
  build_components: string[];
  build_component_paths: string[];
  build_component_info: Record<string, ESPIDFComponentInfo>;
  all_component_info: Record<string, ESPIDFComponentInfo>;
  debug_prefix_map_gdbinit: string;
  gdbinit_files: Record<string, string>;
  debug_arguments_openocd: string;
}

export interface ESPIDFComponentInfo {
  alias: string;
  target: string;
  prefix: string;
  dir: string;
  lib: string;
  reqs: string[];
  priv_reqs: string[];
  managed_reqs: string[];
  managed_priv_reqs: string[];
  include_dirs: string[];
}
