fixture() {
  checkout_path=x
  exit_status=$?
  printf '%s %s %s\n' "$path_var" "$checkout_path" "$exit_status"
  printf '%s\n' "$status"
}
